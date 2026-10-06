import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';

/**
 * 攻撃の 1.5 倍（4096 分率）
 */
const ATTACK_MULTIPLIER = 6144;

/**
 * 相手の攻撃で攻撃する技（ごりむちゅうの持ち主が受けると、持ち主の攻撃が 1.5 倍になる）
 */
const FOUL_PLAY = 'イカサマ';

/**
 * 自分の攻撃を使わない物理技（イカサマは相手の攻撃、ボディプレスは自分の防御）
 */
const NON_OWN_ATTACK_MOVES: ReadonlySet<string> = new Set([FOUL_PLAY, 'ボディプレス']);

/**
 * ごりむちゅう（Gorilla Tactics）特性の効果
 * 攻撃が 1.5 倍になる。最初に出した技（わるあがきを除く）しか出せなくなる（locksMoveChoice）。
 * 技の固定と、固定された技以外を出せなくするのはエンジンが行う（choiceLockedMoveId。交代で解ける）
 *
 * - 自分の物理技: 与えるダメージを 1.5 倍にする（modifyDamageDealt）。イカサマ・ボディプレスは自分の攻撃を使わないので変えない
 * - 相手のイカサマ: 自分の攻撃で計算されるので、受けるダメージを 1.5 倍にする（modifyDamage）
 *
 * 本家ではかたやぶりで無視されない（breakable でない）ので、unaffectedByMoldBreaker を true にする
 *
 * 注: 攻撃の実数値ではなく、ダメージの最終段に 1.5 倍を掛けて近似する。ダメージ式の +2 と
 *     タイプ一致・タイプ相性の倍率にも掛かるため、本家と数ポイント違うことがある
 */
export class GorillaTacticsEffect implements IAbilityEffect {
  readonly locksMoveChoice = true;
  readonly unaffectedByMoldBreaker = true;

  modifyDamageDealt(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (
      battleContext?.moveCategory !== 'Physical' ||
      NON_OWN_ATTACK_MOVES.has(battleContext.moveName ?? '')
    ) {
      return undefined;
    }
    return modifyByFixedPoint(damage, ATTACK_MULTIPLIER);
  }

  modifyDamage(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number {
    return battleContext?.moveName === FOUL_PLAY
      ? modifyByFixedPoint(damage, ATTACK_MULTIPLIER)
      : damage;
  }
}
