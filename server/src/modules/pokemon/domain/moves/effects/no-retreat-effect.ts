import { BaseMultiHitEffect } from './base-multi-hit-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「はいすいのじん」の特殊効果実装
 *
 * 効果: 1ターンに2回攻撃し、必ず相手をひるませる
 *       (Hits twice in one turn, with a 100% chance to make the target flinch)
 *
 * - 攻撃回数の決定は BaseMultiHitEffect が担う
 * - ひるみ付与は命中後（onHit）に常時実行する
 */
export class NoRetreatEffect extends BaseMultiHitEffect {
  protected readonly minHits = 2;
  protected readonly maxHits = 2;

  async onHit(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    if (defender.statusCondition && defender.statusCondition !== StatusCondition.None) {
      return null;
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, {
      statusCondition: StatusCondition.Flinch,
    });

    return 'flinched!';
  }
}
