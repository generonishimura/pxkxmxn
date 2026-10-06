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
import {
  DamageCalculationParams,
  DamageCalculator,
  MoveInfo,
} from '../../domain/logic/damage-calculator';
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
import { MoveFlags, isContactMove } from '@/modules/pokemon/domain/moves/move-flags';
import { HitResult } from '@/modules/pokemon/domain/battle-events/hit-result';
import { StatType } from '@/modules/pokemon/domain/moves/effects/base/base-stat-change-effect';
import { resolveEffectiveWeather } from '../../domain/logic/effective-weather';

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
   * 1. ヒットのコンテキストを作る（技名・技フラグ・効果のある天候・実数値・ランク無視・優先度）
   * 2. 両者の特性の preventsMove（しめりけなど）で技が失敗するかを判定する
   * 3. 防御側特性の isImmuneToMove（ぼうおんなど）で技そのものが無効かを判定する（無効なら onMoveBlocked）
   * 4. 技の shouldFail（ゆめくいなど）で技が失敗するかを判定する
   * 5. 命中判定
   * 6. 技タイプの決定（技の modifyMoveType → 攻撃側特性の modifyMoveType）と、技全体のタイプ相性
   * 7. 技の beforeDamage（連続技の回数決定）。このあと両者の状態を取り直す
   * 8. 技の威力の決定（技の modifyMovePower）
   * 9. ヒットごとにダメージを適用し、防御側特性の onDamagingHit → 攻撃側特性の onSourceDamagingHit を呼ぶ
   * 10. 接触時の特性 → onHit → afterDamage（合計ダメージ） → 防御側特性の onAfterMoveHit → 攻撃側特性の onKnockOut
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

    // ダメージ技かどうか。威力が null の攻撃技（おしおきなど）は modifyMovePower があればダメージ技として扱う
    const isDamagingMove =
      move.category !== 'Status' &&
      (move.power !== null || moveEffect?.modifyMovePower !== undefined);

    // 攻撃側特性の modifyPriority を反映した優先度（じょおうのいげんなどの判定用）
    battleContext.effectivePriority =
      attackerAbilityEffect?.modifyPriority?.(attacker, move.priority, battleContext) ??
      move.priority;

    // 特性による技の失敗（しめりけ・じょおうのいげんなど）。両者の特性で、命中判定の前に判定する
    const preventingAbilityName = this.findMovePreventingAbility({
      attacker,
      defender,
      attackerAbilityName,
      defenderAbilityName,
      attackerAbilityEffect,
      defenderAbilityEffect,
      battleContext,
    });
    if (preventingAbilityName) {
      await this.consumePp(battlePokemonMoveId);
      return `Used ${move.name} but it failed (${preventingAbilityName})`;
    }

    // 技そのものの無効化（ぼうおん・ぼうだんなど）。変化技も含め、命中判定の前に判定する
    if (
      MoveFlags.targetsOpponent(move.name) &&
      defenderAbilityEffect?.isImmuneToMove?.(defender, battleContext) === true
    ) {
      await this.consumePp(battlePokemonMoveId);
      // 無効にしたあとの防御側特性の効果（かぜのりの攻撃ランク+1など）
      const blockedMessage = await defenderAbilityEffect.onMoveBlocked?.(defender, battleContext);
      return blockedMessage
        ? `Used ${move.name} but it had no effect ${blockedMessage}`
        : `Used ${move.name} but it had no effect`;
    }

    // 技の条件による失敗（ゆめくいは相手がねむりでなければ失敗）。命中判定の前に判定する
    if (moveEffect?.shouldFail?.(attacker, defender, battleContext) === true) {
      await this.consumePp(battlePokemonMoveId);
      return `Used ${move.name} but it failed`;
    }

    // 命中率判定（変化技の場合は常に命中とみなす）
    if (isDamagingMove) {
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
    if (!isDamagingMove) {
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

    let currentAttacker = attacker;
    let updatedDefender = defender;

    // 技のタイプを決定（技の効果 → 攻撃側特性の順）。beforeDamage（シャドースチールなど）で使うため先に決める
    const moveType = await this.resolveMoveType(
      move,
      moveEffect,
      attacker,
      defender,
      attackerAbilityEffect,
      battleContext,
    );
    battleContext.moveTypeName = moveType.name;

    // ダメージ計算の入力（攻撃側・防御側はその時点の最新の状態を使う）
    const typeEffectiveness = await this.typeEffectivenessRepository.getTypeEffectivenessMap();
    const createDamageParams = (
      power: number | null,
      baseDamageRatio?: number,
    ): DamageCalculationParams => ({
      attacker: currentAttacker,
      defender: updatedDefender,
      move: { power, typeId: moveType.id, category: move.category, accuracy: move.accuracy },
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
      baseDamageRatio,
    });

    // 技全体のタイプ相性（0 なら技が相手に効かない。シャドースチールはランクを奪わない）
    battleContext.moveTypeEffectiveness = DamageCalculator.calculateMoveEffectiveness(
      createDamageParams(move.power),
    );

    // ダメージ計算前の技の効果（連続技の回数決定、シャドースチールのランクを奪う効果など）
    if (moveEffect?.beforeDamage) {
      await moveEffect.beforeDamage(attacker, defender, move, battleContext);
      // beforeDamage でランクなどが変わることがあるため、最新の状態を取り直す
      currentAttacker =
        (await this.battleRepository.findBattlePokemonStatusById(attacker.id)) ?? attacker;
      updatedDefender =
        (await this.battleRepository.findBattlePokemonStatusById(defender.id)) ?? defender;
      battleContext.attacker = currentAttacker;
      battleContext.defender = updatedDefender;
    }

    // 技の威力を決定
    const power =
      moveEffect?.modifyMovePower?.(currentAttacker, updatedDefender, battleContext) ?? move.power;
    // 威力が決まらなかった場合はダメージを与えない（PPは消費される）
    if (power === null) {
      await this.consumePp(battlePokemonMoveId);
      return `Used ${move.name}`;
    }
    battleContext.movePower = power;

    // ヒットごとの基礎ダメージの倍率（連続技・おやこあいの追加ヒット）。威力はどのヒットも同じ
    const hitDamageRatios = this.resolveHitDamageRatios(
      currentAttacker,
      attackerAbilityEffect,
      battleContext,
    );
    if (hitDamageRatios.length > 1) {
      battleContext.multiHitCount = hitDamageRatios.length;
    }

    // ヒットごとにダメージを計算して適用
    // damage は実際に減らしたHPの合計（残りHPを超えた分は含めない。反動などはこの値を使う）
    let damage = 0;
    let hitCount = 0;
    const hpBeforeMove = updatedDefender.currentHp;
    // ヒットの前後で呼ぶ防御側特性は、かたやぶりでも無視しない（じきゅうりょく・さめはだなど）
    const defenderEventEffect = defenderAbilityName
      ? AbilityRegistry.get(defenderAbilityName)
      : undefined;
    const hitEventMessages: string[] = [];
    const createHitResult = (hitDamage: number, hpBefore: number, hitIndex: number): HitResult => ({
      damage: hitDamage,
      hpBefore,
      hitIndex,
      hitCount,
      isContact: isContactMove(battleContext),
      moveTypeName: moveType.name,
      moveCategory: move.category,
      targetFainted: updatedDefender.isFainted(),
    });
    for (const [hitIndex, hitDamageRatio] of hitDamageRatios.entries()) {
      battleContext.hitIndex = hitIndex;
      const hitDamage = await DamageCalculator.calculate(createDamageParams(power, hitDamageRatio));

      // ダメージを適用
      const hpBeforeHit = updatedDefender.currentHp;
      const newHp = Math.max(0, hpBeforeHit - hitDamage);
      const dealtDamage = hpBeforeHit - newHp;
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

      // ヒットごとの特性（防御側の onDamagingHit → 攻撃側の onSourceDamagingHit）
      if (
        dealtDamage > 0 &&
        (defenderEventEffect?.onDamagingHit || attackerAbilityEffect?.onSourceDamagingHit)
      ) {
        // 特性で能力ランク・HP・状態異常が変わるため、そのたびに両者の状態を取り直す
        const refreshStatuses = async (): Promise<void> => {
          currentAttacker =
            (await this.battleRepository.findBattlePokemonStatusById(attacker.id)) ??
            currentAttacker;
          updatedDefender =
            (await this.battleRepository.findBattlePokemonStatusById(defender.id)) ??
            updatedDefender;
          battleContext.attacker = currentAttacker;
          battleContext.defender = updatedDefender;
        };
        const hit = createHitResult(dealtDamage, hpBeforeHit, hitIndex);
        let defenderMessage: string | null = null;
        if (defenderEventEffect?.onDamagingHit) {
          defenderMessage = await defenderEventEffect.onDamagingHit(
            updatedDefender,
            currentAttacker,
            hit,
            battleContext,
          );
          // 攻撃側の特性に、防御側の特性で変わったあとの状態を渡す（わたげの素早さ低下など）
          await refreshStatuses();
        }
        let attackerMessage: string | null = null;
        if (attackerAbilityEffect?.onSourceDamagingHit) {
          attackerMessage = await attackerAbilityEffect.onSourceDamagingHit(
            currentAttacker,
            updatedDefender,
            hit,
            battleContext,
          );
          // 次のヒットのために取り直す
          await refreshStatuses();
        }
        hitEventMessages.push(
          ...[defenderMessage, attackerMessage].filter((m): m is string => Boolean(m)),
        );
      }

      // 無効化された・どちらかがひんしになった場合は残りのヒットをしない
      if (hitDamage === 0 || updatedDefender.isFainted() || currentAttacker.isFainted()) {
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
    let attackerForMoveEffect = currentAttacker;
    let defenderForMoveEffect = updatedDefender;
    if (damage > 0 && defenderEventEffect?.applyContactStatusCondition) {
      const applied = await defenderEventEffect.applyContactStatusCondition(
        updatedDefender,
        currentAttacker,
        battleContext,
      );
      if (applied) {
        contactEffectMessage = ` ${defenderAbilityName} activated!`;
        // くだけるよろい（防御側）やぬめぬめ（攻撃側）などで能力ランク・状態異常が変わるため、
        // 追加効果が古い状態で上書きしないよう最新の状態を取得し直す
        attackerForMoveEffect =
          (await this.battleRepository.findBattlePokemonStatusById(attacker.id)) ?? currentAttacker;
        defenderForMoveEffect =
          (await this.battleRepository.findBattlePokemonStatusById(defender.id)) ?? updatedDefender;
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

    // 技全体のあとの特性（防御側の onAfterMoveHit → 相手をひんしにした攻撃側の onKnockOut）
    const afterMoveMessages = await this.runAfterMoveHooks({
      attackerId: attacker.id,
      defenderId: defender.id,
      attackerAbilityEffect,
      defenderEventEffect,
      createMoveHit: () => createHitResult(damage, hpBeforeMove, hitCount - 1),
      damage,
      battleContext,
    });

    const hitCountMessage = hitCount > 1 ? ` (hit ${hitCount} times)` : '';
    const eventMessage = hitEventMessages.map(message => ` ${message}`).join('');
    const afterMoveMessage = afterMoveMessages.map(message => ` ${message}`).join('');
    return `Used ${move.name} and dealt ${damage} damage${hitCountMessage}${contactEffectMessage}${eventMessage}${moveEffectMessage}${afterMoveMessage}`;
  }

  /**
   * 技全体のあとの特性を呼ぶ
   * - 防御側の onAfterMoveHit: 合計ダメージが1以上のとき（いかりのこうら・ぎゃくじょう）
   * - 攻撃側の onKnockOut: 相手がひんしで、自分がひんしでないとき（じしんかじょうなど）
   * @returns 特性のメッセージ
   */
  private async runAfterMoveHooks(params: {
    attackerId: number;
    defenderId: number;
    attackerAbilityEffect: IAbilityEffect | undefined;
    defenderEventEffect: IAbilityEffect | undefined;
    createMoveHit: () => HitResult;
    damage: number;
    battleContext: BattleContext;
  }): Promise<string[]> {
    const { attackerAbilityEffect, defenderEventEffect, battleContext } = params;
    if (!defenderEventEffect?.onAfterMoveHit && !attackerAbilityEffect?.onKnockOut) {
      return [];
    }

    const messages: Array<string | null | undefined> = [];
    let attacker = await this.battleRepository.findBattlePokemonStatusById(params.attackerId);
    let defender = await this.battleRepository.findBattlePokemonStatusById(params.defenderId);
    if (!attacker || !defender) {
      return [];
    }

    if (params.damage > 0 && defenderEventEffect?.onAfterMoveHit) {
      messages.push(
        await defenderEventEffect.onAfterMoveHit(
          defender,
          attacker,
          params.createMoveHit(),
          battleContext,
        ),
      );
      attacker = (await this.battleRepository.findBattlePokemonStatusById(attacker.id)) ?? attacker;
      defender = (await this.battleRepository.findBattlePokemonStatusById(defender.id)) ?? defender;
    }

    if (defender.isFainted() && !attacker.isFainted() && attackerAbilityEffect?.onKnockOut) {
      messages.push(await attackerAbilityEffect.onKnockOut(attacker, defender, battleContext));
    }

    return messages.filter((message): message is string => Boolean(message));
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
      baseMoveTypeName: move.type.name,
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
      hasRecoil: params.moveEffect?.hasRecoil === true,
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
   * 技を失敗させる特性（preventsMove）を探し、その特性名を返す
   * 攻撃側 → 防御側の順に判定する。防御側の特性効果は、かたやぶりで無視されたものなら渡さない
   */
  private findMovePreventingAbility(params: {
    attacker: BattlePokemonStatus;
    defender: BattlePokemonStatus;
    attackerAbilityName: string | undefined;
    defenderAbilityName: string | undefined;
    attackerAbilityEffect: IAbilityEffect | undefined;
    defenderAbilityEffect: IAbilityEffect | undefined;
    battleContext: BattleContext;
  }): string | undefined {
    const { battleContext } = params;
    if (params.attackerAbilityEffect?.preventsMove?.(params.attacker, 'attacker', battleContext)) {
      return params.attackerAbilityName;
    }
    if (params.defenderAbilityEffect?.preventsMove?.(params.defender, 'defender', battleContext)) {
      return params.defenderAbilityName;
    }
    return undefined;
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
   * ヒットごとの基礎ダメージの倍率を返す（undefined は倍率なし）。要素の数がヒット数になる
   * - 連続技（battleContext.multiHitCount が2以上）: 倍率なしを回数分
   * - 単発技: 攻撃側特性の getAdditionalHitDamageRatios（おやこあい）で追加ヒットを加える。
   *   追加ヒットの倍率は DamageCalculator が基礎ダメージ（+2 のあと）に 4096 分率で掛ける（本家と同じ）
   */
  private resolveHitDamageRatios(
    attacker: BattlePokemonStatus,
    attackerAbilityEffect: IAbilityEffect | undefined,
    battleContext: BattleContext,
  ): Array<number | undefined> {
    const multiHitCount = battleContext.multiHitCount ?? 1;
    if (multiHitCount > 1) {
      return Array.from({ length: multiHitCount }, () => undefined);
    }
    const ratios =
      attackerAbilityEffect?.getAdditionalHitDamageRatios?.(attacker, battleContext) ?? [];
    return [undefined, ...ratios];
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
   * 特性のフックは呼ばない（本家の getConfusionDamage と同じく、特性の補正を受けない）
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
      // 混乱の自傷は能力値とランクだけで決まり、特性の補正・無効化を受けない（テクニシャン・ふしぎなまもりなど）
      attackerAbilityName: undefined,
      defenderAbilityName: undefined,
      attackerStats: attackerStats,
      defenderStats: attackerStats, // 自分自身なので同じステータス
      battle,
    });

    return damage;
  }
}
