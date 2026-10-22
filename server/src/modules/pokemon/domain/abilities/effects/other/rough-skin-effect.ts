import { BaseContactRecoilDamageEffect } from '../base/base-contact-recoil-damage-effect';

/**
 * さめはだ（Rough Skin）特性の効果
 * 接触技を受けたとき、攻撃側に最大HPの1/8のダメージを与える
 * 注: 接触技の判定は物理技で近似している（既存の接触系特性と同じ）。
 * 状態異常を付与するためのフック（applyContactStatusCondition）をダメージ付与に流用している。
 */
export class RoughSkinEffect extends BaseContactRecoilDamageEffect {
  protected readonly damageDivisor = 8;
}
