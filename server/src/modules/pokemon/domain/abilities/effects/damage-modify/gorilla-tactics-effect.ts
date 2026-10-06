import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';

/**
 * 攻撃の 1.5 倍（4096 分率）
 */
const ATTACK_MULTIPLIER = 6144;

/**
 * ごりむちゅう（Gorilla Tactics）特性の効果
 * 攻撃が 1.5 倍になる。最初に出した技（わるあがきを除く）しか出せなくなる（locksMoveChoice）。
 * 技の固定と、固定された技以外を出せなくするのはエンジンが行う（choiceLockedMoveId。交代で解ける）
 *
 * - 自分の物理技: 与えるダメージを 1.5 倍にする（modifyDamageDealt）。
 *   イカサマ（相手の攻撃で計算）・ボディプレス（自分の防御で計算）も物理技なので 1.5 倍にする。
 *   本家では、攻撃の補正は計算に使う値に関係なく、物理技を出した側の特性・持ち物で掛かるため
 * - 相手のイカサマ: 持ち主の攻撃の値を使うが、補正は技を出した相手にだけ掛かるので、受けるダメージは変えない
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
    if (battleContext?.moveCategory !== 'Physical') {
      return undefined;
    }
    return modifyByFixedPoint(damage, ATTACK_MULTIPLIER);
  }
}
