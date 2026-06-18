import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 「いびき」の特殊効果実装
 *
 * 効果: 30%の確率で相手にひるみを付与 (Has a 30% chance to make the target flinch)
 * 制約: 使用者が「ねむり」状態のときのみ発動する
 *
 * 注: 「使用者が眠っていないとそもそも技が発動しない（ダメージも与えない）」という
 *     完全な仕様は、現状の `IMoveEffect` には事前判定フックがないため対応不可。
 *     ここでは「ひるみ付与」効果のみを使用者眠り条件でガードする。
 */
export class SnoreEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Flinch;
  protected readonly chance = 0.3;
  protected readonly immuneTypes: string[] = [];
  protected readonly message = 'flinched!';

  override async onHit(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (attacker.statusCondition !== StatusCondition.Sleep) {
      return null;
    }
    return super.onHit(attacker, defender, battleContext);
  }
}
