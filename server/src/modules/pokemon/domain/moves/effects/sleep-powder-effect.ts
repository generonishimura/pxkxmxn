import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「ねむりごな」の特殊効果実装
 *
 * 効果: 75%の確率で相手をねむりにする
 */
export class SleepPowderEffect implements IMoveEffect {
  /**
   * ねむり付与の確率（75%）
   */
  private static readonly SLEEP_CHANCE = 0.75;

  /**
   * 技が命中したときに発動
   * 75%の確率で相手をねむりにする
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

    // くさタイプはねむりにならない
    const trainedPokemon = await battleContext.trainedPokemonRepository.findById(
      defender.trainedPokemonId,
    );
    if (!trainedPokemon) {
      return null;
    }

    const isGrassType =
      trainedPokemon.pokemon.primaryType.name === 'くさ' ||
      trainedPokemon.pokemon.secondaryType?.name === 'くさ';
    if (isGrassType) {
      return null;
    }

    // 確率判定
    if (Math.random() >= SleepPowderEffect.SLEEP_CHANCE) {
      return null;
    }

    // ねむりを付与
    await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, {
      statusCondition: StatusCondition.Sleep,
    });

    return `${defender.id} fell asleep!`;
  }
}

