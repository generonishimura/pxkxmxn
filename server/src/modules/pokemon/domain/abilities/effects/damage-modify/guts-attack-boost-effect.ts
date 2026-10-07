import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { isMajorStatus } from '@/modules/battle/domain/logic/major-status';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';
import { BattleContext } from '../../battle-context.interface';

/**
 * こんじょう（Guts）特性の効果
 *
 * 状態異常（やけど・まひ・どく・もうどく・ねむり）のとき、攻撃が1.5倍になる（4096分率で 6144）。
 * やけどによる物理技のダメージ半減も受けない。
 *
 * - 攻撃を使う物理技だけに効く（特殊技・ボディプレスには効かない）
 * - ひるみ・こんらんは状態異常ではないので発動しない
 * - からげんきはもともとやけどの半減を受けないので、1.5倍だけを掛ける
 *
 * 注: 攻撃の1.5倍は威力に掛ける（ダメージ式では攻撃と威力は掛け算なので同じ位置）。
 *     本家は攻撃の実数値を丸めるため、まれにダメージが1ずれることがある
 * 注: エンジンはやけどの半減を攻撃に掛けるため、やけどのときは威力を2倍にして打ち消す
 * 注: こおりのときは発動させない。こおりのポケモンは治ってからでないと技を出せないので、本家では
 *     技を出すときに状態異常がなく、1.5倍にならない。エンジンは治る前の状態のまま技の処理に渡すため、
 *     ここに来る「こおり」は古い状態で、本当はもう治っている
 */
export class GutsAttackBoostEffect implements IAbilityEffect {
  /**
   * 攻撃の倍率（4096分率で 1.5倍）
   */
  private static readonly ATTACK_MODIFIER = 6144;

  /**
   * やけどの半減（攻撃 × 0.5）を打ち消す倍率
   */
  private static readonly BURN_CANCEL_MULTIPLIER = 2;

  /**
   * もともとやけどの半減を受けない技
   */
  private static readonly IGNORES_BURN_MOVE_NAMES: ReadonlySet<string> = new Set(['からげんき']);

  /**
   * 攻撃ではなく防御で計算する物理技
   */
  private static readonly NON_ATTACK_MOVE_NAMES: ReadonlySet<string> = new Set(['ボディプレス']);

  /**
   * 技を出すときには、もう治っているはずの状態異常
   */
  private static readonly STALE_STATUS_CONDITIONS: ReadonlySet<StatusCondition> = new Set([
    StatusCondition.Freeze,
  ]);

  modifyBasePower(
    pokemon: BattlePokemonStatus,
    power: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (
      battleContext?.moveCategory !== 'Physical' ||
      !isMajorStatus(pokemon.statusCondition) ||
      GutsAttackBoostEffect.STALE_STATUS_CONDITIONS.has(pokemon.statusCondition)
    ) {
      return undefined;
    }
    const moveName = battleContext.moveName ?? '';
    const burnCancelled =
      pokemon.statusCondition === StatusCondition.Burn &&
      !GutsAttackBoostEffect.IGNORES_BURN_MOVE_NAMES.has(moveName)
        ? power * GutsAttackBoostEffect.BURN_CANCEL_MULTIPLIER
        : power;
    if (GutsAttackBoostEffect.NON_ATTACK_MOVE_NAMES.has(moveName)) {
      return burnCancelled === power ? undefined : burnCancelled;
    }
    return modifyByFixedPoint(burnCancelled, GutsAttackBoostEffect.ATTACK_MODIFIER);
  }
}
