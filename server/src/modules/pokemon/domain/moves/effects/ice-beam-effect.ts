import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「こおりのつぶて」の特殊効果実装
 *
 * 効果: 10%の確率で相手をこおりにする
 */
export class IceBeamEffect implements IMoveEffect {
  /**
   * こおり付与の確率（10%）
   */
  private static readonly FREEZE_CHANCE = 0.1;

  /**
   * 技が命中したときに発動
   * 10%の確率で相手をこおりにする
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

    // こおりタイプはこおりにならない
    const trainedPokemon = await battleContext.trainedPokemonRepository.findById(
      defender.trainedPokemonId,
    );
    if (!trainedPokemon) {
      return null;
    }

    const isIceType =
      trainedPokemon.pokemon.primaryType.name === 'こおり' ||
      trainedPokemon.pokemon.secondaryType?.name === 'こおり';
    if (isIceType) {
      return null;
    }

    // 確率判定
    if (Math.random() >= IceBeamEffect.FREEZE_CHANCE) {
      return null;
    }

    // こおりを付与
    await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, {
      statusCondition: StatusCondition.Freeze,
    });

    return `${defender.id} was frozen solid!`;
  }
}

