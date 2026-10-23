import { AttackStatOverride, IMoveEffect } from '../move-effect.interface';

/**
 * ボディプレス（Body Press）技の効果
 *
 * 攻撃の代わりに、自分の防御の実数値と防御ランクでダメージを計算する。
 * 受ける側は今までどおり防御で受ける（物理技）
 *
 * 根拠（Pokémon Showdown）: overrideOffensiveStat: 'def'。
 * やけどの半減は掛かる（本家と同じ。物理技なので getDamage の burn の補正を受ける）
 */
export class BodyPressEffect implements IMoveEffect {
  readonly attackStatOverride: AttackStatOverride = { source: 'attacker', stat: 'defense' };
}
