import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { applyMaxHpSelfDamage } from './base/apply-max-hp-self-damage';

/**
 * わるあがき（Struggle）技の効果
 *
 * 効果: 命中後、使用者が最大HPの1/4（四捨五入、最低1）の反動ダメージを受ける（第5世代以降の仕様）
 *
 * BaseRecoilEffect は与えたダメージ基準で afterDamage を使うが、わるあがきは最大HP基準のため onHit で処理する
 *
 * タイプなしの技として計算する（typeless）。タイプ相性は1倍で、ゴーストタイプにも当たり、タイプ一致もない（本家と同じ）
 *
 * 注: PPが尽きたときに自動で選ばれる点と、命中判定を必ず通る点は対象外
 */
export class StruggleEffect implements IMoveEffect {
  readonly typeless = true;

  async onHit(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const recoilDamage = await applyMaxHpSelfDamage(attacker.id, 4, battleContext, 'round');
    if (recoilDamage === null) {
      return null;
    }

    return `is damaged by recoil! (${recoilDamage} damage)`;
  }
}
