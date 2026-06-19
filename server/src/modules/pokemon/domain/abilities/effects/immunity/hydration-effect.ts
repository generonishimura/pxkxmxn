import { BaseTurnEndSelfStatusCureEffect } from '../base/base-turn-end-self-status-cure-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * うるおいボディ（Hydration）特性の効果
 * 雨の間、ターン終了時に自分の状態異常を治す
 */
export class HydrationEffect extends BaseTurnEndSelfStatusCureEffect {
  protected shouldCure(_pokemon: BattlePokemonStatus, battleContext: BattleContext): boolean {
    return battleContext.battle?.weather === Weather.Rain;
  }
}
