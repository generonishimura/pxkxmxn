import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { applyMaxHpSelfDamage } from './base/apply-max-hp-self-damage';

/**
 * わるあがき（Struggle）技の効果
 *
 * 効果: 命中後、使用者が最大HPの1/4（切り捨て、最低1）の反動ダメージを受ける
 *
 * BaseRecoilEffect は与えたダメージ基準で afterDamage を使うが、わるあがきは最大HP基準のため onHit で処理する
 *
 * 注: 反動のみを扱う。タイプ相性を無視する（タイプなし）点や、PPが尽きたときに自動で選ばれる点は対象外
 */
export class StruggleEffect implements IMoveEffect {
  async onHit(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const recoilDamage = await applyMaxHpSelfDamage(attacker.id, 4, battleContext);
    if (recoilDamage === null) {
      return null;
    }

    return `is damaged by recoil! (${recoilDamage} damage)`;
  }
}
