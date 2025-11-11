import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「かえんほうしゃ」の特殊効果実装
 *
 * 効果: 10%の確率で相手にやけどを付与
 */
export class FlamethrowerEffect implements IMoveEffect {
  /**
   * やけど付与の確率（10%）
   */
  private static readonly BURN_CHANCE = 0.1;

  /**
   * 技が命中したときに発動
   * 10%の確率で相手にやけどを付与
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

    // ほのおタイプはやけどにならない
    const trainedPokemon = await battleContext.trainedPokemonRepository.findById(
      defender.trainedPokemonId,
    );
    if (!trainedPokemon) {
      return null;
    }

    const isFireType =
      trainedPokemon.pokemon.primaryType.name === 'ほのお' ||
      trainedPokemon.pokemon.secondaryType?.name === 'ほのお';
    if (isFireType) {
      return null;
    }

    // 確率判定
    if (Math.random() >= FlamethrowerEffect.BURN_CHANCE) {
      return null;
    }

    // やけどを付与
    await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, {
      statusCondition: StatusCondition.Burn,
    });

    return `${defender.id} was burned!`;
  }
}

