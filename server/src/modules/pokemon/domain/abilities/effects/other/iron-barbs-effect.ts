import { BaseContactRecoilDamageEffect } from '../base/base-contact-recoil-damage-effect';

/**
 * てつのトゲ（Iron Barbs）特性の効果
 * 接触技を受けたとき、攻撃側に最大HPの1/8（切り捨て、最低1）のダメージを与える
 *
 * - 接触技の判定は isContactMove（技フラグの contact）で行う。えんかくの攻撃では発動しない
 * - ダメージは技以外のダメージなので、攻撃側のマジックガードで防がれる
 * 注: 本家は接触したヒットごとにダメージを与えるが、ここでは連続技でも技全体で1回だけ与える
 */
export class IronBarbsEffect extends BaseContactRecoilDamageEffect {
  protected readonly damageDivisor = 8;
}
