import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「10まんボルト」の特殊効果実装
 *
 * 効果: 10%の確率で相手にまひを付与
 */
export class ThunderboltEffect implements IMoveEffect {
  /**
   * まひ付与の確率（10%）
   */
  private static readonly PARALYSIS_CHANCE = 0.1;

  /**
   * 技が命中したときに発動
   * 10%の確率で相手にまひを付与
   */
  async onHit(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository || !battleContext.trainedPokemonRepository) {
      return null;
    }

    // 既に状態異常がある場合は付与しない
    if (defender.statusCondition && defender.statusCondition !== StatusCondition.None) {
      return null;
    }

    // でんきタイプはまひにならない
    const trainedPokemon = await battleContext.trainedPokemonRepository.findById(
      defender.trainedPokemonId,
    );
    if (!trainedPokemon) {
      return null;
    }

    const isElectricType =
      trainedPokemon.pokemon.primaryType.name === 'でんき' ||
      trainedPokemon.pokemon.secondaryType?.name === 'でんき';
    if (isElectricType) {
      return null;
    }

    // 確率判定
    if (Math.random() >= ThunderboltEffect.PARALYSIS_CHANCE) {
      return null;
    }

    // まひを付与
    await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, {
      statusCondition: StatusCondition.Paralysis,
    });

    return `${defender.id} was paralyzed!`;
  }
}

