import { IAbilityEffect } from '../../ability-effect.interface';
import { BattleContext } from '../../battle-context.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';

/**
 * はりこみ（Stakeout）特性の効果
 * 相手がこのターンに交代で出てきたとき、相手に与えるダメージが2倍になる
 *
 * - 「このターンに出てきた」は、相手の volatileState.switchedInTurn が今の Battle.turn と同じかで判定する
 * - 先発（バトル開始時に出たポケモン）は switchedInTurn が 0 なので、1ターン目でも発動しない（本家と同じ）
 * - ボディプレスは攻撃ではなく防御で計算するので、発動しない（本家は攻撃・特攻を2倍にするため）
 *
 * 注: 本家は攻撃・特攻の実数値を2倍にするが、ここでは威力を2倍にする。ダメージ式では威力と攻撃の積を使うので、
 * ほかの威力補正と重なったときの丸め以外は同じ結果になる
 */
export class StakeoutEffect implements IAbilityEffect {
  /**
   * 威力の補正（4096分率で2倍）
   */
  private static readonly POWER_MODIFIER = 8192;

  /**
   * 防御で攻撃側の能力を計算する技（はりこみの対象外）
   */
  private static readonly DEFENSE_BASED_MOVE_NAME = 'ボディプレス';

  modifyBasePower(
    _pokemon: BattlePokemonStatus,
    power: number,
    battleContext?: BattleContext,
  ): number | undefined {
    const switchedInTurn = battleContext?.defender?.volatileState.switchedInTurn;
    if (
      !battleContext ||
      switchedInTurn === undefined ||
      switchedInTurn !== battleContext.battle.turn ||
      battleContext.moveName === StakeoutEffect.DEFENSE_BASED_MOVE_NAME
    ) {
      return undefined;
    }
    return modifyByFixedPoint(power, StakeoutEffect.POWER_MODIFIER);
  }
}
