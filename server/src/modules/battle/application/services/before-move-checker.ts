import { Battle } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { IBattleRepository } from '../../domain/battle.repository.interface';
import { StatusConditionHandler } from '../../domain/logic/status-condition-handler';
import { hasFlinched } from '../../domain/logic/volatile-status-condition';
import {
  findMoveRestriction,
  moveRestrictionMessage,
  resolveMoveSlots,
} from '../../domain/logic/move-selection';
import { MutableStatePatch, isEmptyObject } from '../../domain/state/state-field-parser';
import { VolatileState } from '../../domain/state/volatile-state';
import { Move } from '@/modules/pokemon/domain/entities/move.entity';
import { MoveBehaviors } from '@/modules/pokemon/domain/moves/move-behaviors';
import { IAbilityEffect } from '@/modules/pokemon/domain/abilities/ability-effect.interface';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';

/**
 * 技を出す前の判定の結果
 * - cancelled: 技を出せない（message が行動の結果）
 * - それ以外: attacker は判定で変わったあとの状態、prefix は技のメッセージの前に付ける文（こおりが溶けたなど）
 */
export type BeforeMoveResult =
  | { readonly cancelled: true; readonly message: string }
  | { readonly cancelled: false; readonly attacker: BattlePokemonStatus; readonly prefix: string };

/**
 * 技を出す前の判定に渡すもの
 */
export interface BeforeMoveParams {
  readonly battle: Battle;
  readonly move: Move;
  readonly attacker: BattlePokemonStatus;
  readonly defender: BattlePokemonStatus;
  readonly attackerAbilityEffect: IAbilityEffect | undefined;
  readonly battleContext: BattleContext;
  /** 混乱の自傷ダメージを求める（MoveExecutorService が渡す） */
  readonly calculateConfusionSelfDamage: (attacker: BattlePokemonStatus) => Promise<number>;
}

/**
 * メロメロで動けない確率（50%）
 */
const INFATUATION_IMMOBILIZE_CHANCE = 0.5;

/**
 * BeforeMoveChecker
 * 技を出そうとしたときに、技を出せるかを判定する（本家の onBeforeMove の順）
 *
 * 1. 反動（mustRecharge）: 動けない
 * 2. ねむり: 動けない（いびき・ねごとは出せる）
 * 3. こおり: 20% で溶ける（かえんぐるまなど defrost の技は必ず溶ける）
 * 4. 使用者の特性の onBeforeMove（なまけ）
 * 5. ひるみ: 動けない。使用者の特性の onFlinch（ふくつのこころ）を呼ぶ
 * 6. 技の制限（かなしばり・かいふくふうじ・じごくづき・ちょうはつ・ふういん・アンコール・いちゃもん・こだわり）
 * 7. こんらん: 残り回数を 1 減らす。0 なら解ける。解けていなければ 33% で自分を攻撃する
 * 8. メロメロ: 50% で動けない
 * 9. まひ: 25% で動けない
 *
 * 2〜9 で技を出せなかったときは、ため技・出し続ける技の状態を消す（ころがる・あばれるなどが止まる）
 */
export class BeforeMoveChecker {
  constructor(private readonly battleRepository: IBattleRepository) {}

  async check(params: BeforeMoveParams): Promise<BeforeMoveResult> {
    const { move, attackerAbilityEffect, battleContext } = params;
    let attacker = params.attacker;
    const prevented = (message: string): Promise<BeforeMoveResult> =>
      this.prevent(attacker, message);

    // 1. 反動で動けない（このターンの行動として扱い、ため・出し続けの状態は変えない）
    if (attacker.volatileState.mustRecharge === true) {
      await this.battleRepository.patchVolatileState(attacker.id, { mustRecharge: null });
      return { cancelled: true, message: 'Pokemon must recharge' };
    }

    // 2. ねむり（ねむっていても出せる技は出せる）
    if (
      attacker.statusCondition === StatusCondition.Sleep &&
      !MoveBehaviors.has(move.name, 'sleepUsable')
    ) {
      return prevented('Cannot act due to sleep');
    }

    // 3. こおり
    let prefix = '';
    if (attacker.statusCondition === StatusCondition.Freeze) {
      if (!MoveBehaviors.has(move.name, 'defrost') && !StatusConditionHandler.shouldClearFreeze()) {
        return prevented('Cannot act due to freeze');
      }
      await this.battleRepository.updateBattlePokemonStatus(attacker.id, {
        statusCondition: StatusCondition.None,
      });
      attacker = await this.refresh(attacker);
      prefix = 'Pokemon thawed out! ';
    }

    // 4. 使用者の特性で動けない（なまけ）
    const beforeMoveMessage = await attackerAbilityEffect?.onBeforeMove?.(attacker, battleContext);
    if (beforeMoveMessage) {
      return prevented(beforeMoveMessage);
    }

    // 5. ひるみ
    if (hasFlinched(attacker)) {
      const flinchMessage = await attackerAbilityEffect?.onFlinch?.(attacker, battleContext);
      return prevented(
        flinchMessage
          ? `Pokemon flinched and couldn't move ${flinchMessage}`
          : "Pokemon flinched and couldn't move",
      );
    }

    // 6. 技の制限
    const restriction = findMoveRestriction(
      attacker.volatileState,
      { moveId: move.id, moveName: move.name, category: move.category },
      { imprisonedMoveIds: await this.findImprisonedMoveIds(params.defender) },
    );
    if (restriction) {
      return prevented(moveRestrictionMessage(restriction, move.name));
    }

    // 7. こんらん
    const confusionTurns = attacker.volatileState.confusionTurns;
    if (confusionTurns !== undefined) {
      const remaining = confusionTurns - 1;
      attacker = await this.patchAndRefresh(attacker, {
        confusionTurns: remaining > 0 ? remaining : null,
      });
      if (remaining <= 0) {
        prefix += 'Pokemon snapped out of confusion! ';
      } else if (StatusConditionHandler.shouldSelfAttackFromConfusion()) {
        // 混乱の自傷ダメージはタイプなしで威力40の物理攻撃として計算（みがわりには当たらない）
        const selfDamage = await params.calculateConfusionSelfDamage(attacker);
        await this.battleRepository.updateBattlePokemonStatus(attacker.id, {
          currentHp: Math.max(0, attacker.currentHp - selfDamage),
        });
        return prevented(`Pokemon is confused and hurt itself in confusion (${selfDamage} damage)`);
      }
    }

    // 8. メロメロ（相手が場を離れると、交代の処理で infatuatedWithStatusId が消える）
    if (
      attacker.volatileState.infatuatedWithStatusId === params.defender.id &&
      Math.random() < INFATUATION_IMMOBILIZE_CHANCE
    ) {
      return prevented('Pokemon is immobilized by love');
    }

    // 9. まひ
    if (
      attacker.statusCondition === StatusCondition.Paralysis &&
      !StatusConditionHandler.canAct(attacker)
    ) {
      return prevented('Cannot act due to paralysis');
    }

    return { cancelled: false, attacker, prefix };
  }

  /**
   * 技を出せなかったときの片付け（ため技・出し続ける技・連続で出した回数を消す）
   */
  private async prevent(attacker: BattlePokemonStatus, message: string): Promise<BeforeMoveResult> {
    const state = attacker.volatileState;
    const patch: MutableStatePatch<VolatileState> = {};
    if (state.chargingMoveId !== undefined) {
      patch.chargingMoveId = null;
    }
    if (state.semiInvulnerable !== undefined) {
      patch.semiInvulnerable = null;
    }
    if (state.lockedInMove !== undefined) {
      patch.lockedInMove = null;
    }
    if (state.uproar !== undefined) {
      patch.uproar = null;
    }
    if (state.consecutiveMoveCount !== undefined) {
      patch.consecutiveMoveCount = null;
    }
    if (!isEmptyObject(patch)) {
      await this.battleRepository.patchVolatileState(attacker.id, patch);
    }
    return { cancelled: true, message };
  }

  /**
   * 相手がふういんを使っていれば、相手が覚えている技の ID（ものまねの入れ替えを含む）
   */
  private async findImprisonedMoveIds(
    opponent: BattlePokemonStatus,
  ): Promise<readonly number[] | undefined> {
    if (opponent.volatileState.imprison !== true) {
      return undefined;
    }
    const moves =
      (await this.battleRepository.findBattlePokemonMovesByBattlePokemonStatusId(opponent.id)) ??
      [];
    return resolveMoveSlots(moves, opponent.volatileState).map(slot => slot.moveId);
  }

  private async patchAndRefresh(
    pokemon: BattlePokemonStatus,
    patch: MutableStatePatch<VolatileState>,
  ): Promise<BattlePokemonStatus> {
    await this.battleRepository.patchVolatileState(pokemon.id, patch);
    return this.refresh(pokemon);
  }

  /**
   * 最新の状態を読み直す（読めなければ手元の状態を使う）
   */
  private async refresh(pokemon: BattlePokemonStatus): Promise<BattlePokemonStatus> {
    return (await this.battleRepository.findBattlePokemonStatusById(pokemon.id)) ?? pokemon;
  }
}
