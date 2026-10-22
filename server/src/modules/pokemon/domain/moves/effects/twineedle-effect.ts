import { BaseMultiHitEffect } from './base-multi-hit-effect';
import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
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
 * 注: 本家はヒットごとに追加効果を判定するが、エンジンは onHit を1回だけ呼ぶため、どくの判定も1回だけ
 */
export class TwineedleEffect extends BaseMultiHitEffect {
  protected readonly minHits = 2;
  protected readonly maxHits = 2;

  private readonly poisonEffect = new TwineedlePoisonEffect();

  async onHit(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    return this.poisonEffect.onHit(attacker, defender, battleContext);
  }
}
