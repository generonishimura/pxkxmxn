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
import { Move } from '@/modules/pokemon/domain/entities/move.entity';
import { IMoveEffect } from '@/modules/pokemon/domain/moves/move-effect.interface';
import { IAbilityEffect } from '@/modules/pokemon/domain/abilities/ability-effect.interface';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { MoveFlags } from '@/modules/pokemon/domain/moves/move-flags';
import { StatType } from '@/modules/pokemon/domain/moves/effects/base/base-stat-change-effect';
import { resolveEffectiveWeather } from '../../domain/logic/effective-weather';
import { modifyByFixedPoint } from '../../domain/logic/fixed-point-modifier';

/**
 * 技の実行オプション
 */
export interface ExecuteMoveOptions {
  /**
   * このターン、技の使用者が最後に行動するかどうか（アナライズ）
   */
  isLastToMove?: boolean;
}

/**
 * MoveExecutorService
 * 技の実行を処理するサービス
 */
@Injectable()
export class MoveExecutorService {
  /**
   * 混乱の自傷専用に使用する「実在しないタイプID」。
   *
   * この値は混乱時の自傷ダメージ計算で使用され、タイプ相性を1.0倍（無効化なし）として扱うために使用される。
   *
   * 前提条件:
   * - Prismaスキーマでは、TypeのIDは`@id @default(autoincrement())`で定義されており、
   *   PostgreSQLのSERIAL型（自動インクリメント）を使用している。
   * - これにより、データベースに保存されるTypeのIDは常に正の値（1以上）となる。
   *
   * この前提が破られた場合の影響:
   * - もし将来的にTypeのIDとして負の値や0が使用されるようになった場合、
   *   この定数と衝突する可能性がある。
   * - その場合は、この定数の値を変更するか、別の方法（例: 特別な定数値の使用）を検討する必要がある。
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
   *
   * ダメージ技の流れ:
   * 1. ヒットのコンテキストを作る（技名・技フラグ・効果のある天候・実数値・ランク無視）
   * 2. 防御側特性の isImmuneToMove（ぼうおんなど）で技そのものが無効かを判定する
   * 3. 命中判定
   * 4. 技の beforeDamage（連続技の回数決定）
   * 5. 技タイプの決定（技の modifyMoveType → 攻撃側特性の modifyMoveType）
   * 6. 技の威力の決定（技の modifyMovePower）
   * 7. ヒットごとにダメージを計算して適用（連続技・おやこあいの追加ヒット）
   * 8. 接触時の特性 → onHit → afterDamage（合計ダメージ）
   */
  async executeMove(
    battle: Battle,
    attackerTrainerId: number,
    moveId: number,
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battlePokemonMoveId: number,
    options: ExecuteMoveOptions = {},
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

    const moveEffect = MoveRegistry.get(move.name);
    const attackerAbilityName = attackerTrainedPokemon.ability?.name;
    const defenderAbilityName = defenderTrainedPokemon.ability?.name;
    const attackerAbilityEffect = attackerAbilityName
      ? AbilityRegistry.get(attackerAbilityName)
      : undefined;
    // かたやぶり系の特性を持つ場合、防御側の特性効果は無視する
    const defenderAbilityEffect =
      defenderAbilityName &&
      !AbilityRegistry.isIgnoredByMoldBreaker(attackerAbilityName, defenderAbilityName)
        ? AbilityRegistry.get(defenderAbilityName)
        : undefined;

    // バトルコンテキストを作成（技の特殊効果・特性のフック用）
    const battleContext = this.createHitContext({
      battle,
      move,
      moveEffect,
      attacker,
      defender,
      attackerTrainedPokemon,
      defenderTrainedPokemon,
      attackerAbilityEffect,
      defenderAbilityEffect,
      options,
    });

    // 技そのものの無効化（ぼうおん・ぼうだんなど）。変化技も含め、命中判定の前に判定する
    if (
      MoveFlags.targetsOpponent(move.name) &&
      defenderAbilityEffect?.isImmuneToMove?.(defender, battleContext) === true
    ) {
      await this.consumePp(battlePokemonMoveId);
      return `Used ${move.name} but it had no effect`;
    }

    // 命中率判定（変化技の場合は常に命中とみなす）
    if (move.category !== 'Status' && move.power !== null) {
      const hit = AccuracyCalculator.checkHit(
        move.accuracy,
        attacker,
        defender,
        attackerAbilityName,
        defenderAbilityName,
        battleContext,
      );

      if (!hit) {
        // 外れた場合でもPPは消費される
        await this.consumePp(battlePokemonMoveId);

        // 技の特殊効果（onMiss）を呼び出す
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
      let moveEffectMessage: string | null = null;
      if (moveEffect?.onUse) {
        moveEffectMessage = await moveEffect.onUse(attacker, defender, battleContext);
      }

      return moveEffectMessage ? `Used ${move.name} ${moveEffectMessage}` : `Used ${move.name}`;
    }

    // 追加効果の確率倍率（てんのめぐみ）と、相手への追加効果の無効化（りんぷん）
    battleContext.secondaryEffectChanceMultiplier =
      attackerAbilityEffect?.secondaryEffectChanceMultiplier;
    battleContext.secondaryEffectsSuppressed =
      defenderAbilityEffect?.blocksSecondaryEffects === true;

    // ダメージ計算前の技の効果（連続技の回数決定など）
    if (moveEffect?.beforeDamage) {
      await moveEffect.beforeDamage(attacker, defender, move, battleContext);
    }

    // 技のタイプを決定（技の効果 → 攻撃側特性の順）
    const moveType = await this.resolveMoveType(
      move,
      moveEffect,
      attacker,
      defender,
      attackerAbilityEffect,
      battleContext,
    );
    battleContext.moveTypeName = moveType.name;

    // 技の威力を決定
    const power = moveEffect?.modifyMovePower?.(attacker, defender, battleContext) ?? move.power;
    battleContext.movePower = power;

    // ヒットごとの威力（連続技・おやこあいの追加ヒット）
    const hitPowers = this.resolveHitPowers(power, attacker, attackerAbilityEffect, battleContext);
    if (hitPowers.length > 1) {
      battleContext.multiHitCount = hitPowers.length;
    }

    // タイプ相性を取得
    const typeEffectiveness = await this.typeEffectivenessRepository.getTypeEffectivenessMap();

    // ヒットごとにダメージを計算して適用
    // damage は実際に減らしたHPの合計（残りHPを超えた分は含めない。反動などはこの値を使う）
    let damage = 0;
    let hitCount = 0;
    let updatedDefender = defender;
    for (const [hitIndex, hitPower] of hitPowers.entries()) {
      battleContext.hitIndex = hitIndex;
      const moveInfo: MoveInfo = {
        power: hitPower,
        typeId: moveType.id,
        category: move.category,
        accuracy: move.accuracy,
      };

      const hitDamage = await DamageCalculator.calculate({
        attacker,
        defender: updatedDefender,
        move: moveInfo,
        moveType,
        attackerTypes: {
          primary: attackerTrainedPokemon.pokemon.primaryType,
          secondary: attackerTrainedPokemon.pokemon.secondaryType,
        },
        defenderTypes: {
          primary: defenderTrainedPokemon.pokemon.primaryType,
          secondary: defenderTrainedPokemon.pokemon.secondaryType,
        },
        typeEffectiveness,
        weather: battleContext.weather ?? null,
        field: battle.field,
        attackerAbilityName,
        defenderAbilityName,
        attackerStats: battleContext.attackerStats,
        defenderStats: battleContext.defenderStats,
        battle,
        // ヒットごとの値（hitIndex など）を固定するため、その時点のコピーを渡す
        battleContext: { ...battleContext },
        attackStatOverride: moveEffect?.attackStatOverride,
        ignoresBurnPenalty: moveEffect?.ignoresBurnPenalty,
      });

      // ダメージを適用
      const newHp = Math.max(0, updatedDefender.currentHp - hitDamage);
      const dealtDamage = updatedDefender.currentHp - newHp;
      await this.battleRepository.updateBattlePokemonStatus(defender.id, {
        currentHp: newHp,
      });

      // 更新後のdefenderを取得（次のヒットと状態異常付与のために最新の状態を取得）
      const latestDefender = await this.battleRepository.findBattlePokemonStatusById(defender.id);
      if (!latestDefender) {
        throw new NotFoundException('Defender BattlePokemonStatus', defender.id);
      }
      updatedDefender = latestDefender;
      battleContext.defender = latestDefender;
      damage += dealtDamage;
      hitCount += 1;

      // 無効化された・ひんしになった場合は残りのヒットをしない
      if (hitDamage === 0 || latestDefender.isFainted()) {
        break;
      }
    }

    // タイプ無効化が発動した場合（ダメージが0の場合）、HP回復などの効果を処理
    if (damage === 0 && defenderTrainedPokemon?.ability) {
      const abilityEffect = AbilityRegistry.get(defenderTrainedPokemon.ability.name);
      if (abilityEffect?.onAfterTakingDamage) {
        // タイプ無効化が発動したことを示すために、元のダメージとして0を渡す
        await abilityEffect.onAfterTakingDamage(updatedDefender, 0, battleContext);
      }
    }

    // 接触技による状態異常付与（防御側の特性）
    let contactEffectMessage = '';
    // 技の追加効果に渡すポケモンの状態（接触時の特性で変わった場合は取得し直す）
    let attackerForMoveEffect = attacker;
    let defenderForMoveEffect = updatedDefender;
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
          // くだけるよろい（防御側）やぬめぬめ（攻撃側）などで能力ランク・状態異常が変わるため、
          // 追加効果が古い状態で上書きしないよう最新の状態を取得し直す
          attackerForMoveEffect =
            (await this.battleRepository.findBattlePokemonStatusById(attacker.id)) ?? attacker;
          defenderForMoveEffect =
            (await this.battleRepository.findBattlePokemonStatusById(defender.id)) ??
            updatedDefender;
        }
      }
    }

    // PPを消費
    await this.consumePp(battlePokemonMoveId);

    // 技の特殊効果（onHit）を呼び出す
    let moveEffectMessage = '';
    if (moveEffect?.onHit) {
      const hitMessage = await moveEffect.onHit(
        attackerForMoveEffect,
        defenderForMoveEffect,
        battleContext,
      );
      if (hitMessage) {
        moveEffectMessage = ` ${hitMessage}`;
      }
    }

    // ダメージ適用後の技の効果（反動など）。全ヒットで実際に減らしたHPの合計を渡す
    if (moveEffect?.afterDamage) {
      const afterDamageMessage = await moveEffect.afterDamage(
        attackerForMoveEffect,
        defenderForMoveEffect,
        damage,
        battleContext,
      );
      if (afterDamageMessage) {
        moveEffectMessage += ` ${afterDamageMessage}`;
      }
    }

    const hitCountMessage = hitCount > 1 ? ` (hit ${hitCount} times)` : '';
    return `Used ${move.name} and dealt ${damage} damage${hitCountMessage}${contactEffectMessage}${moveEffectMessage}`;
  }

  /**
   * ヒット共通のコンテキストを作成
   * 技フラグは攻撃側特性の modifyMoveFlags を、無視するランクは技と両者の特性を反映する
   */
  private createHitContext(params: {
    battle: Battle;
    move: Move;
    moveEffect: IMoveEffect | undefined;
    attacker: BattlePokemonStatus;
    defender: BattlePokemonStatus;
    attackerTrainedPokemon: TrainedPokemon;
    defenderTrainedPokemon: TrainedPokemon;
    attackerAbilityEffect: IAbilityEffect | undefined;
    defenderAbilityEffect: IAbilityEffect | undefined;
    options: ExecuteMoveOptions;
  }): BattleContext {
    const { battle, move, attacker, defender } = params;
    const attackerAbilityName = params.attackerTrainedPokemon.ability?.name;
    const defenderAbilityName = params.defenderTrainedPokemon.ability?.name;
    const context: BattleContext = {
      battle,
      battleRepository: this.battleRepository,
      trainedPokemonRepository: this.trainedPokemonRepository,
      weather: resolveEffectiveWeather(battle.weather, [attackerAbilityName, defenderAbilityName]),
      field: battle.field,
      moveName: move.name,
      moveTypeName: move.type.name,
      moveCategory: move.category,
      movePower: move.power,
      movePriority: move.priority,
      attackerAbilityName,
      defenderAbilityName,
      attacker,
      defender,
      attackerStats: this.calculateStats(params.attackerTrainedPokemon),
      defenderStats: this.calculateStats(params.defenderTrainedPokemon),
      isLastToMove: params.options.isLastToMove,
    };

    const baseFlags = MoveFlags.get(move.name);
    context.moveFlags =
      params.attackerAbilityEffect?.modifyMoveFlags?.(attacker, baseFlags, context) ?? baseFlags;

    context.ignoredDefenderRanks = new Set<StatType>([
      ...(params.moveEffect?.ignoredDefenderRanks ?? []),
      ...(params.attackerAbilityEffect?.ignoreOpponentRanks?.(attacker, 'attacker', context) ?? []),
    ]);
    context.ignoredAttackerRanks = new Set<StatType>(
      params.defenderAbilityEffect?.ignoreOpponentRanks?.(defender, 'defender', context) ?? [],
    );

    return context;
  }

  /**
   * 技のタイプを決定する（技の modifyMoveType → 攻撃側特性の modifyMoveType）
   * タイプ名が変わった場合はリポジトリからタイプを引く。見つからない場合は技本来のタイプを使う
   */
  private async resolveMoveType(
    move: Move,
    moveEffect: IMoveEffect | undefined,
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    attackerAbilityEffect: IAbilityEffect | undefined,
    battleContext: BattleContext,
  ): Promise<Type> {
    let typeName =
      moveEffect?.modifyMoveType?.(attacker, defender, battleContext) ?? move.type.name;
    battleContext.moveTypeName = typeName;
    typeName =
      attackerAbilityEffect?.modifyMoveType?.(attacker, typeName, battleContext) ?? typeName;

    if (typeName === move.type.name) {
      return move.type;
    }
    return (await this.typeEffectivenessRepository.findTypeByName(typeName)) ?? move.type;
  }

  /**
   * ヒットごとの威力を返す
   * - 連続技（battleContext.multiHitCount が2以上）: 同じ威力を回数分
   * - 単発技: 攻撃側特性の getAdditionalHitPowerRatios（おやこあい）で追加ヒットを加える。
   *   追加ヒットの威力は 4096 分率で補正する（0.25倍 = 1024/4096）
   */
  private resolveHitPowers(
    power: number,
    attacker: BattlePokemonStatus,
    attackerAbilityEffect: IAbilityEffect | undefined,
    battleContext: BattleContext,
  ): number[] {
    const multiHitCount = battleContext.multiHitCount ?? 1;
    if (multiHitCount > 1) {
      return Array.from({ length: multiHitCount }, () => power);
    }
    const ratios =
      attackerAbilityEffect?.getAdditionalHitPowerRatios?.(attacker, battleContext) ?? [];
    return [power, ...ratios.map(ratio => modifyByFixedPoint(power, ratio, 1))];
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
