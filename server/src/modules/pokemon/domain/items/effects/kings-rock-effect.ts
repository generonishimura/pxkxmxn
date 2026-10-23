import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../../abilities/battle-context.interface';
import { HitResult } from '../../battle-events/hit-result';
import { canInflictStatus, inflictStatus } from '../../battle-events/status-infliction';
import { hasFlinchSecondary, rollSecondaryEffect } from '../../moves/secondary-effect';
import { IItemEffect } from '../item-effect.interface';

/**
 * おうじゃのしるし（King's Rock）
 * 攻撃技でダメージを与えたヒットのたびに、10% の確率で相手をひるませる
 *
 * - 技の追加効果として扱う（本家は技の secondaries に足す）。てんのめぐみで確率が 2 倍になり、相手のりんぷんで防がれる
 * - もともとひるみの追加効果を持つ技（かみつくなど）には足さない（本家と同じ）
 * - 持ち主の特性があくしゅうなら、あくしゅうと同じひるみなので重ねない（本家はどちらか一方だけが足す）
 * - 本家はちからずくで追加効果を消したあとに足すので、ちからずくで追加効果が消えた技でもひるませる
 */
export class KingsRockEffect implements IItemEffect {
  private static readonly CHANCE = 0.1;
  private static readonly STENCH = 'あくしゅう';

  async onSourceDamagingHit(
    holder: BattlePokemonStatus,
    target: BattlePokemonStatus,
    _hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (
      !battleContext ||
      hasFlinchSecondary(battleContext.moveName) ||
      battleContext.attackerAbilityName === KingsRockEffect.STENCH
    ) {
      return null;
    }
    const options = {
      source: { pokemon: holder, kind: 'other' as const, name: 'おうじゃのしるし' },
    };
    if (!(await canInflictStatus(target, StatusCondition.Flinch, battleContext, options))) {
      return null;
    }
    if (
      !rollSecondaryEffect(KingsRockEffect.CHANCE, battleContext, 'target', {
        ignoresSheerForce: true,
      })
    ) {
      return null;
    }
    const messages = await inflictStatus(target, StatusCondition.Flinch, battleContext, options);
    return ['flinched!', ...messages].join(' ');
  }
}
