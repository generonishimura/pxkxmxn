import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { isMajorStatus } from '@/modules/battle/domain/logic/major-status';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * からげんき（Facade）技の効果
 *
 * 使用者がやけど・まひ・どく・もうどくのとき、威力が2倍（70 → 140）になる。
 * ねむりのときは2倍にならない（本家と同じ）。
 * こおりは技を出す前に治る（からげんきは溶かす技ではないので、こおったままでは出せない）ため、2倍にしない。
 * 先に動いた相手の技でこのターンになった状態異常も見る（beforeDamage を持つことで、威力を決める前に最新の状態を取り直させる）。
 * やけどによる物理技のダメージ半減も受けない
 */
export class FacadeEffect implements IMoveEffect {
  /**
   * 威力の倍率
   */
  private static readonly POWER_MULTIPLIER = 2;

  readonly ignoresBurnPenalty = true;

  /**
   * ダメージ計算前に何もしない
   *
   * このメソッドがあると、MoveExecutorService が威力を決める前に使用者の最新の状態を取り直す。
   * executeMove に渡る状態はターン開始時のものなので、このターンに受けた状態異常やこおりが溶けたことを見るために必要
   */
  beforeDamage(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * 使用者が状態異常（ねむり・こおりを除く）なら威力を2倍にする
   */
  modifyMovePower(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): number | undefined {
    const status = attacker.statusCondition;
    const power = battleContext.movePower;
    if (
      !isMajorStatus(status) ||
      status === StatusCondition.Sleep ||
      status === StatusCondition.Freeze ||
      power == null
    ) {
      return undefined;
    }
    return power * FacadeEffect.POWER_MULTIPLIER;
  }
}
