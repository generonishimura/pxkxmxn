import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { applyIndirectDamage } from '../../../battle-events/indirect-damage';

/**
 * とびだすなかみ（Innards Out）特性の効果
 * 攻撃技でひんしになったとき、受ける前に残っていたHPと同じだけのダメージを攻撃側に与える
 *
 * - ひんしになったヒットで1回だけ発動する（hit.damage は実際に減らしたHPなので、受ける前のHPと同じ）
 * - 接触技でなくても発動する。かたやぶりでは止まらない（本家と同じ）
 * - ダメージは技以外のダメージなので、攻撃側のマジックガードで防がれる（本家と同じ）
 */
export class InnardsOutEffect implements IAbilityEffect {
  private static readonly ABILITY_NAME = 'とびだすなかみ';

  async onDamagingHit(
    _holder: BattlePokemonStatus,
    attacker: BattlePokemonStatus,
    hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext || !hit.targetFainted) {
      return null;
    }

    const dealt = await applyIndirectDamage(attacker, hit.damage, battleContext);
    return dealt > 0 ? `${InnardsOutEffect.ABILITY_NAME} activated!` : null;
  }
}
