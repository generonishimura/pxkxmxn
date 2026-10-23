import { BaseContactRecoilDamageEffect } from '../../abilities/effects/base/base-contact-recoil-damage-effect';
import { IItemEffect } from '../item-effect.interface';

/**
 * ゴツゴツメット（Rocky Helmet）
 * 接触技を受けたヒットのたびに、攻撃側の HP を最大 HP の 1/6 減らす
 *
 * - てつのトゲ・さめはだと同じ仕組み（BaseContactRecoilDamageEffect の onDamagingHit）を使う
 * - 技以外のダメージなので、攻撃側のマジックガードで防がれる。みがわりに当たったヒットでは働かない（本家と同じ）
 * - 持ち主がひんしになったヒットでも働く（本家と同じ）
 */
export class RockyHelmetEffect extends BaseContactRecoilDamageEffect implements IItemEffect {
  protected readonly damageDivisor = 6;
  protected readonly abilityName = 'ゴツゴツメット';
}
