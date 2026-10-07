import { BaseMultiHitEffect } from './base-multi-hit-effect';
import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { HitResult } from '../../battle-events/hit-result';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * ダブルニードルの追加効果（20%の確率でどく）
 */
class TwineedlePoisonEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Poison;
  protected readonly chance = 0.2;
  protected readonly immuneTypes = ['どく', 'はがね'];
  protected readonly message = 'was poisoned!';
}

/**
 * ダブルニードル（Twineedle）技の効果
 *
 * 効果: 毎回2回連続で攻撃し、20%の確率で相手をどくにする
 *
 * どくの判定はヒットごとの onDamagingHit で行う（本家と同じく、ヒットのたびに20%を判定する。
 * 少なくとも1回どくにできる確率は 1 - 0.8 × 0.8 = 36%）
 */
export class TwineedleEffect extends BaseMultiHitEffect {
  protected readonly minHits = 2;
  protected readonly maxHits = 2;

  private readonly poisonEffect = new TwineedlePoisonEffect();

  async onDamagingHit(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    _hit: HitResult,
    battleContext: BattleContext,
  ): Promise<string | null> {
    return this.poisonEffect.onHit(attacker, defender, battleContext);
  }
}
