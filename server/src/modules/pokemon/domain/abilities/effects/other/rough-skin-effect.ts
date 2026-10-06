import { BaseContactRecoilDamageEffect } from '../base/base-contact-recoil-damage-effect';

/**
 * さめはだ（Rough Skin）特性の効果
 * 接触技を受けたとき、攻撃側に最大HPの1/8（切り捨て、最低1）のダメージを与える
 *
 * - 接触したヒットごとに与える（連続技ではヒットのたびに与える。本家と同じ）
 * - 接触技の判定は技フラグの contact で行う。えんかくの攻撃では発動しない
 * - ダメージは技以外のダメージなので、攻撃側のマジックガードで防がれる
 */
export class RoughSkinEffect extends BaseContactRecoilDamageEffect {
  protected readonly damageDivisor = 8;
  protected readonly abilityName = 'さめはだ';
}
