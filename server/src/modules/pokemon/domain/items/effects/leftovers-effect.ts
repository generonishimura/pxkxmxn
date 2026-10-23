import { IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { applyHeal } from '../../battle-events/heal';

/**
 * たべのこし（Leftovers）
 * ターン終了時に、最大 HP の 1/16 を回復する（かいふくふうじ中は回復しない。applyHeal が判定する）
 */
export class LeftoversEffect implements IItemEffect {
  private static readonly HEAL_RATIO = 1 / 16;

  async onTurnEnd(pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    if (!battleContext?.battleRepository || pokemon.currentHp >= pokemon.maxHp) {
      return;
    }
    const healAmount = Math.max(1, Math.floor(pokemon.maxHp * LeftoversEffect.HEAL_RATIO));
    await applyHeal(pokemon, healAmount, battleContext);
  }
}
