import { BaseTurnEndSelfStatusCureEffect } from '../base/base-turn-end-self-status-cure-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * だっぴ（Shed Skin）特性の効果
 * ターン終了時に 30% の確率で自分の状態異常を治す
 */
export class ShedSkinEffect extends BaseTurnEndSelfStatusCureEffect {
  private static readonly CURE_CHANCE = 0.3;

  protected shouldCure(_pokemon: BattlePokemonStatus, _battleContext: BattleContext): boolean {
    return Math.random() < ShedSkinEffect.CURE_CHANCE;
  }
}
