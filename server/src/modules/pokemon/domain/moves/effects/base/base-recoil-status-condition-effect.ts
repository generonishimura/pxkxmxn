import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { BaseStatusConditionEffect } from '../base-status-condition-effect';
import { BaseRecoilEffect } from './base-recoil-effect';

/**
 * 反動ダメージ + 状態異常の追加効果をもつ技の基底クラス（フレアドライブ・ボルテッカー）
 *
 * 状態異常の付与は BaseStatusConditionEffect、反動の計算と適用は BaseRecoilEffect に任せる。
 * 反動は与えたダメージの33/100（四捨五入、最低1）。いしあたま・マジックガードでは受けない
 */
export abstract class BaseRecoilStatusConditionEffect extends BaseStatusConditionEffect {
  /**
   * 反動のある技（すてみの対象）
   */
  readonly hasRecoil = true;

  private readonly recoil = new (class extends BaseRecoilEffect {
    protected readonly recoilRatio = 33 / 100;
    protected readonly message = '反動で{damage}ダメージを受けた';
  })();

  async afterDamage(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    damage: number,
    battleContext: BattleContext,
  ): Promise<string | null> {
    return this.recoil.afterDamage(attacker, defender, damage, battleContext);
  }
}
