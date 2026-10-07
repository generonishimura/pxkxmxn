import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * すりぬけ（Infiltrator）特性の効果
 * 自分の技は、相手のリフレクター・ひかりのかべ・オーロラベール・しんぴのまもり・しろいきり・みがわりを無視する
 *
 * - 無視する判定はエンジン（技の本体・DamageCalculator・canInflictStatus・applyStatChanges）が infiltrates を見て行う
 * - 攻撃側の特性なので、かたやぶりとは関係なく効く
 */
export class InfiltratorEffect implements IAbilityEffect {
  readonly infiltrates = true;
}
