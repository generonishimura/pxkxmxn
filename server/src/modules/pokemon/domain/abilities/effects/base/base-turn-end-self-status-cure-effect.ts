import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * ターン終了時に条件付きで自分の状態異常を治す特性の基底クラス
 *
 * 例:
 *  - うるおいボディ（Hydration）: 雨の間、ターン終了時に状態異常治癒
 *  - だっぴ（Shed Skin）: 30%の確率でターン終了時に状態異常治癒
 *
 * 派生クラスは `shouldCure` を override して発動条件を指定する
 */
export abstract class BaseTurnEndSelfStatusCureEffect implements IAbilityEffect {
  /**
   * 治癒を発動するかどうかを判定
   */
  protected abstract shouldCure(
    pokemon: BattlePokemonStatus,
    battleContext: BattleContext,
  ): boolean;

  async onTurnEnd(pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    if (!battleContext?.battleRepository) {
      return;
    }

    if (!pokemon.statusCondition || pokemon.statusCondition === StatusCondition.None) {
      return;
    }

    if (!this.shouldCure(pokemon, battleContext)) {
      return;
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(pokemon.id, {
      statusCondition: StatusCondition.None,
    });
  }
}
