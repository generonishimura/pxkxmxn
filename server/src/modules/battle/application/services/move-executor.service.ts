import { Injectable, Inject } from '@nestjs/common';
import { Battle } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import {
  IBattleRepository,
  BATTLE_REPOSITORY_TOKEN,
} from '../../domain/battle.repository.interface';
import {
  ITrainedPokemonRepository,
  TRAINED_POKEMON_REPOSITORY_TOKEN,
} from '@/modules/trainer/domain/trainer.repository.interface';
import {
  IMoveRepository,
  ITypeEffectivenessRepository,
  MOVE_REPOSITORY_TOKEN,
  TYPE_EFFECTIVENESS_REPOSITORY_TOKEN,
} from '@/modules/pokemon/domain/pokemon.repository.interface';
import { TrainedPokemon } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { DamageCalculator, MoveInfo } from '../../domain/logic/damage-calculator';
import { AccuracyCalculator } from '../../domain/logic/accuracy-calculator';
import { StatCalculator } from '../../domain/logic/stat-calculator';
import { StatusConditionHandler } from '../../domain/logic/status-condition-handler';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { NotFoundException } from '@/shared/domain/exceptions';

/**
 * MoveExecutorService
 * 技の実行を処理するサービス
 */
@Injectable()
export class MoveExecutorService {
  /**
   * 混乱の自傷専用に使用する「実在しないタイプID」。
   * 通常のタイプIDが正の値である前提で負の値を利用する。
   */
  private static readonly CONFUSION_NON_EXISTENT_TYPE_ID = -1;

  constructor(
    @Inject(BATTLE_REPOSITORY_TOKEN)
    private readonly battleRepository: IBattleRepository,
    @Inject(TRAINED_POKEMON_REPOSITORY_TOKEN)
    private readonly trainedPokemonRepository: ITrainedPokemonRepository,
    @Inject(MOVE_REPOSITORY_TOKEN)
    private readonly moveRepository: IMoveRepository,
    @Inject(TYPE_EFFECTIVENESS_REPOSITORY_TOKEN)
    private readonly typeEffectivenessRepository: ITypeEffectivenessRepository,
  ) {}

  /**
   * 技を実行
   */
  async executeMove(
    battle: Battle,
    attackerTrainerId: number,
    moveId: number,
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battlePokemonMoveId: number,
  ): Promise<string> {
    // 技情報を取得
    const move = await this.moveRepository.findById(moveId);

    if (!move) {
      throw new NotFoundException('Move', moveId);
    }

    // 攻撃側と防御側のポケモン情報を取得
    const attackerTrainedPokemon = await this.trainedPokemonRepository.findById(
      attacker.trainedPokemonId,
    );
    const defenderTrainedPokemon = await this.trainedPokemonRepository.findById(
      defender.trainedPokemonId,
    );

    if (!attackerTrainedPokemon || !defenderTrainedPokemon) {
      const missingId = !attackerTrainedPokemon
        ? attacker.trainedPokemonId
        : defender.trainedPokemonId;
      throw new NotFoundException('TrainedPokemon', missingId);
    }

    // 混乱状態の判定（技を使おうとしたときに自分を攻撃する可能性がある）
    if (attacker.statusCondition === StatusCondition.Confusion) {
      if (StatusConditionHandler.shouldSelfAttackFromConfusion()) {
        // 自分を攻撃する場合、技を使わずに自分にダメージを与える
        // 混乱の自傷ダメージはタイプなしで威力40の物理攻撃として計算
        const selfDamage = await this.calculateConfusionSelfDamage(
          battle,
          attacker,
          attackerTrainedPokemon,
        );
        const newHp = Math.max(0, attacker.currentHp - selfDamage);
        await this.battleRepository.updateBattlePokemonStatus(attacker.id, {
          currentHp: newHp,
        });
        return `Pokemon is confused and hurt itself in confusion (${selfDamage} damage)`;
      }
    }

    // バトルコンテキストを作成（技の特殊効果用）
    const battleContext = {
      battle,
      battleRepository: this.battleRepository,
      trainedPokemonRepository: this.trainedPokemonRepository,
      weather: battle.weather,
      field: battle.field,
      moveCategory: move.category,
      attackerAbilityName: attackerTrainedPokemon.ability?.name,
    };

    // 命中率判定（変化技の場合は常に命中とみなす）
    if (move.category !== 'Status' && move.power !== null) {
      const hit = AccuracyCalculator.checkHit(
        move.accuracy,
        attacker,
        defender,
        attackerTrainedPokemon.ability?.name,
        defenderTrainedPokemon.ability?.name,
        battleContext,
      );

      if (!hit) {
        // 外れた場合でもPPは消費される
        await this.consumePp(battlePokemonMoveId);

        // 技の特殊効果（onMiss）を呼び出す
        const moveEffect = MoveRegistry.get(move.name);
        if (moveEffect?.onMiss) {
          const missMessage = await moveEffect.onMiss(attacker, defender, battleContext);
          if (missMessage) {
            return `Used ${move.name} but it missed. ${missMessage}`;
          }
        }

        return `Used ${move.name} but it missed`;
      }
    }

    // 変化技の場合はダメージなし(PPは消費される)
    if (move.category === 'Status' || move.power === null) {
      await this.consumePp(battlePokemonMoveId);

      // 変化技の特殊効果（onUse）を呼び出す
      const moveEffect = MoveRegistry.get(move.name);
      let moveEffectMessage: string | null = null;
      if (moveEffect?.onUse) {
        moveEffectMessage = await moveEffect.onUse(attacker, defender, battleContext);
      }

      return moveEffectMessage
        ? `Used ${move.name} ${moveEffectMessage}`
        : `Used ${move.name}`;
    }

    // タイプ相性を取得
    const typeEffectiveness = await this.typeEffectivenessRepository.getTypeEffectivenessMap();

    // 実際のステータス値を計算
    const attackerStats = this.calculateStats(attackerTrainedPokemon);
    const defenderStats = this.calculateStats(defenderTrainedPokemon);

    // ダメージを計算
    const moveInfo: MoveInfo = {
      power: move.power,
      typeId: move.type.id,
      category: move.category,
      accuracy: move.accuracy,
    };

    const damage = await DamageCalculator.calculate({
      attacker,
      defender,
      move: moveInfo,
      moveType: move.type,
      attackerTypes: {
        primary: attackerTrainedPokemon.pokemon.primaryType,
        secondary: attackerTrainedPokemon.pokemon.secondaryType,
      },
      defenderTypes: {
        primary: defenderTrainedPokemon.pokemon.primaryType,
        secondary: defenderTrainedPokemon.pokemon.secondaryType,
      },
      typeEffectiveness,
      weather: battle.weather,
      field: battle.field,
      attackerAbilityName: attackerTrainedPokemon.ability?.name,
      defenderAbilityName: defenderTrainedPokemon.ability?.name,
      attackerStats: attackerStats,
      defenderStats: defenderStats,
      battle,
    });

    // ダメージを適用
    const newHp = Math.max(0, defender.currentHp - damage);
    await this.battleRepository.updateBattlePokemonStatus(defender.id, {
      currentHp: newHp,
    });

    // 更新後のdefenderを取得（状態異常付与のために最新の状態を取得）
    const updatedDefender = await this.battleRepository.findBattlePokemonStatusById(defender.id);
    if (!updatedDefender) {
      throw new NotFoundException('Defender BattlePokemonStatus', defender.id);
    }

    // タイプ無効化が発動した場合（ダメージが0の場合）、HP回復などの効果を処理
    if (damage === 0 && defenderTrainedPokemon?.ability) {
      const abilityEffect = AbilityRegistry.get(defenderTrainedPokemon.ability.name);
      if (abilityEffect?.onAfterTakingDamage) {
        const battleContext = {
          battle,
          battleRepository: this.battleRepository,
          trainedPokemonRepository: this.trainedPokemonRepository,
          weather: battle.weather,
          field: battle.field,
          moveTypeName: move.type.name,
          moveCategory: move.category,
        };
        // 元のダメージを計算（タイプ無効化が発動する前のダメージ）
        // 実際には、DamageCalculatorで計算されたダメージが0なので、
        // タイプ無効化が発動したことを示すために、元のダメージを計算する必要はない
        // ただし、HP回復量の計算に使用する可能性があるため、0を渡す
        await abilityEffect.onAfterTakingDamage(updatedDefender, 0, battleContext);
      }
    }

    // 接触技による状態異常付与（防御側の特性）
    let contactEffectMessage = '';
    if (damage > 0 && defenderTrainedPokemon?.ability) {
      const defenderAbilityEffect = AbilityRegistry.get(defenderTrainedPokemon.ability.name);
      if (defenderAbilityEffect && 'applyContactStatusCondition' in defenderAbilityEffect) {
        const applied = await (defenderAbilityEffect as any).applyContactStatusCondition(
          updatedDefender,
          attacker,
          battleContext,
        );
        if (applied) {
          contactEffectMessage = ` ${defenderTrainedPokemon.ability.name} activated!`;
        }
      }
    }

    // PPを消費
    await this.consumePp(battlePokemonMoveId);

    // 技の特殊効果（onHit）を呼び出す
    const moveEffect = MoveRegistry.get(move.name);
    let moveEffectMessage = '';
    if (moveEffect?.onHit) {
      const hitMessage = await moveEffect.onHit(attacker, updatedDefender, battleContext);
      if (hitMessage) {
        moveEffectMessage = ` ${hitMessage}`;
      }
    }

    return `Used ${move.name} and dealt ${damage} damage${contactEffectMessage}${moveEffectMessage}`;
  }

  /**
   * PPを消費
   * @param battlePokemonMoveId バトル中のポケモンの技ID
   */
  private async consumePp(battlePokemonMoveId: number): Promise<void> {
    // 現在のBattlePokemonMoveを取得
    const battlePokemonMove =
      await this.battleRepository.findBattlePokemonMoveById(battlePokemonMoveId);

    if (!battlePokemonMove) {
      throw new NotFoundException('BattlePokemonMove', battlePokemonMoveId);
    }

    // PPを1消費
    const newPp = battlePokemonMove.consumePp(1);

    // PPを更新
    await this.battleRepository.updateBattlePokemonMove(battlePokemonMoveId, {
      currentPp: newPp,
    });
  }

  /**
   * TrainedPokemonから実際のステータス値を計算
   */
  private calculateStats(trainedPokemon: TrainedPokemon): {
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  } {
    const stats = StatCalculator.calculate({
      baseHp: trainedPokemon.pokemon.baseHp,
      baseAttack: trainedPokemon.pokemon.baseAttack,
      baseDefense: trainedPokemon.pokemon.baseDefense,
      baseSpecialAttack: trainedPokemon.pokemon.baseSpecialAttack,
      baseSpecialDefense: trainedPokemon.pokemon.baseSpecialDefense,
      baseSpeed: trainedPokemon.pokemon.baseSpeed,
      level: trainedPokemon.level,
      ivHp: trainedPokemon.ivHp,
      ivAttack: trainedPokemon.ivAttack,
      ivDefense: trainedPokemon.ivDefense,
      ivSpecialAttack: trainedPokemon.ivSpecialAttack,
      ivSpecialDefense: trainedPokemon.ivSpecialDefense,
      ivSpeed: trainedPokemon.ivSpeed,
      evHp: trainedPokemon.evHp,
      evAttack: trainedPokemon.evAttack,
      evDefense: trainedPokemon.evDefense,
      evSpecialAttack: trainedPokemon.evSpecialAttack,
      evSpecialDefense: trainedPokemon.evSpecialDefense,
      evSpeed: trainedPokemon.evSpeed,
      nature: trainedPokemon.nature,
    });

    return {
      attack: stats.attack,
      defense: stats.defense,
      specialAttack: stats.specialAttack,
      specialDefense: stats.specialDefense,
      speed: stats.speed,
    };
  }

  /**
   * 混乱による自分へのダメージを計算
   * 混乱の自傷ダメージはタイプなしで威力40の物理攻撃として計算
   * @param battle バトル
   * @param attacker 攻撃側（自分自身）
   * @param attackerTrainedPokemon 攻撃側の育成個体
   * @returns 受けるダメージ
   */
  private async calculateConfusionSelfDamage(
    battle: Battle,
    attacker: BattlePokemonStatus,
    attackerTrainedPokemon: TrainedPokemon,
  ): Promise<number> {
    // 実際のステータス値を計算
    const attackerStats = this.calculateStats(attackerTrainedPokemon);

    // 混乱の自傷ダメージはタイプなしで威力40の物理攻撃
    // タイプなしの技を作成（タイプ相性は1.0倍、タイプ一致もなし）
    // タイプ相性を1.0倍として扱うため、タイプ相性マップに存在しないタイプIDを使用する
    // タイプ一致を適用しないため、ポケモンのタイプと一致しないタイプIDを使用する
    const nonExistentType = new Type(
      MoveExecutorService.CONFUSION_NON_EXISTENT_TYPE_ID,
      'なし',
      'none',
    ); // タイプなしを表現
    const confusionMoveInfo: MoveInfo = {
      power: 40,
      typeId: MoveExecutorService.CONFUSION_NON_EXISTENT_TYPE_ID, // 存在しないタイプIDを使用（タイプ相性は1.0倍、タイプ一致もなし）
      category: 'Physical',
      accuracy: null, // 必中
    };

    // タイプ相性を1.0倍として扱うため、タイプ相性マップを空にする
    // タイプ相性マップに存在しないタイプIDを使用することで、タイプ相性が1.0倍として扱われる
    const emptyTypeEffectiveness = new Map<string, number>();

    // 自分自身を攻撃する（attacker = defender）
    const damage = await DamageCalculator.calculate({
      attacker,
      defender: attacker, // 自分自身
      move: confusionMoveInfo,
      moveType: nonExistentType,
      attackerTypes: {
        primary: attackerTrainedPokemon.pokemon.primaryType,
        secondary: attackerTrainedPokemon.pokemon.secondaryType,
      },
      defenderTypes: {
        primary: attackerTrainedPokemon.pokemon.primaryType,
        secondary: attackerTrainedPokemon.pokemon.secondaryType,
      },
      typeEffectiveness: emptyTypeEffectiveness, // タイプ相性を1.0倍として扱う
      weather: battle.weather,
      field: battle.field,
      attackerAbilityName: attackerTrainedPokemon.ability?.name,
      defenderAbilityName: attackerTrainedPokemon.ability?.name,
      attackerStats: attackerStats,
      defenderStats: attackerStats, // 自分自身なので同じステータス
      battle,
    });

    return damage;
  }
}
