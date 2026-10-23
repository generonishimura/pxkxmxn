import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { canInflictStatus, inflictStatus } from '../../../battle-events/status-infliction';
import { hasFlinchSecondary, rollSecondaryEffect } from '../../../moves/secondary-effect';

/**
 * あくしゅう（Stench）特性の効果
 * 攻撃技でダメージを与えたとき、10%の確率で相手をひるませる
 *
 * - 技の追加効果として扱う。てんのめぐみで確率が2倍になり、相手のりんぷんで防がれる
 * - 連続技はヒットごとに判定する（本家と同じ）
 * - もともとひるみの追加効果を持つ技（かみつくなど）には足さない（本家と同じ）
 * - 相手のせいしんりょくなどで防がれる
 * 注: ひるみは状態異常と同じ欄に入るため、相手が状態異常のときはひるませられない
 */
export class StenchEffect implements IAbilityEffect {
  async onSourceDamagingHit(
    holder: BattlePokemonStatus,
    target: BattlePokemonStatus,
    _hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext) {
      return null;
    }
    if (hasFlinchSecondary(battleContext.moveName)) {
      return null;
    }

    const options = { source: { pokemon: holder, kind: 'ability' as const, name: 'あくしゅう' } };
    if (!(await canInflictStatus(target, StatusCondition.Flinch, battleContext, options))) {
      return null;
    }
    if (!rollSecondaryEffect(0.1, battleContext, 'target', { ignoresSheerForce: true })) {
      return null;
    }
    const messages = await inflictStatus(target, StatusCondition.Flinch, battleContext, options);
    return ['flinched!', ...messages].join(' ');
  }
}
