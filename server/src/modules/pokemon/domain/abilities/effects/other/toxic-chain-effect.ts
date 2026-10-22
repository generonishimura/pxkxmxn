import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { canInflictStatus, inflictStatus } from '../../../battle-events/status-infliction';

/**
 * どくのくさり（Toxic Chain）特性の効果
 * 自分の技で相手にダメージを与えたヒットのたびに、30%の確率で相手をもうどくにする
 *
 * - 接触しない技でも発動する
 * - 相手のりんぷんで防がれる。てんのめぐみの倍率は掛からない（本家と同じ）
 * - 相手がひんし・状態異常済み・どく/はがねタイプなどで付与できなければ、確率判定をしない
 */
export class ToxicChainEffect implements IAbilityEffect {
  private static readonly CHANCE = 0.3;

  async onSourceDamagingHit(
    holder: BattlePokemonStatus,
    target: BattlePokemonStatus,
    _hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext || battleContext.secondaryEffectsSuppressed === true) {
      return null;
    }

    const options = {
      source: { pokemon: holder, kind: 'ability', name: 'どくのくさり' },
    } as const;
    if (!(await canInflictStatus(target, StatusCondition.BadPoison, battleContext, options))) {
      return null;
    }
    if (Math.random() >= ToxicChainEffect.CHANCE) {
      return null;
    }

    const messages = await inflictStatus(target, StatusCondition.BadPoison, battleContext, options);
    return ['was badly poisoned!', ...messages].join(' ');
  }
}
