import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * りんぷん（Shield Dust）特性の効果
 * 相手の技の追加効果（まひ・ひるみ・能力ランク低下など）を受けない
 *
 * 攻撃側自身への追加効果（げんしのちからの能力上昇など）は止めない。
 * 追加効果は rollSecondaryEffect で判定するので、エンジンが blocksSecondaryEffects を見て止める。
 * かたやぶりで無視される（本家と同じ）
 */
export class ShieldDustEffect implements IAbilityEffect {
  readonly blocksSecondaryEffects = true;
}
