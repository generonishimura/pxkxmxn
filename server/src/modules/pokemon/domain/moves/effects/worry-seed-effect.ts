import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../../abilities/battle-context.interface';
import { BaseSetTargetAbilityEffect } from './base/base-set-target-ability-effect';

/**
 * なやみのタネ（Worry Seed）技の効果
 *
 * 相手の特性をふみんにする。相手がねむっていれば目を覚ます。
 * 相手の今の特性がふみん・なまけか、消せない特性（ぜったいねむりなど）なら失敗する
 * 注: 本家は、相手がふみん・なまけのときは命中判定の前に失敗するが、ここでは命中判定のあとに失敗する
 * 注: とくせいガードで防ぐ効果は扱わない（持ち物の仕組みがない）
 */
export class WorrySeedEffect extends BaseSetTargetAbilityEffect {
  protected readonly abilityName = 'ふみん';
  protected readonly failingAbilityNames = ['ふみん', 'なまけ'];

  protected async afterAbilityChange(
    target: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (target.statusCondition !== StatusCondition.Sleep || !battleContext.battleRepository) {
      return null;
    }
    await battleContext.battleRepository.updateBattlePokemonStatus(target.id, {
      statusCondition: StatusCondition.None,
    });
    return 'The target woke up!';
  }
}
