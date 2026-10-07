import { IAbilityEffect } from '../../ability-effect.interface';
import { BattleContext } from '../../battle-context.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { changeForm } from '../../../battle-events/form-change';

/** メテノの全国図鑑の番号 */
const MINIOR_NATIONAL_DEX = 774;
/** コアのすがた */
const CORE_FORM = 'core';

/**
 * リミットシールド（Shields Down）特性の効果
 * メテノが、場に出たとき（onEntry）とターン終了時（onTurnEnd）に、HP が最大 HP の半分以下ならコアのすがた（'core'）になり、
 * 半分より上ならりゅうせいのすがた（null。既定の 'meteor'）に戻る。フォルムは交代で戻る（volatileState.form）
 * へんしん中・メテノでなければ、フォルムは変わらない
 * 注: フォルムが変わったメッセージは出ない（onEntry・onTurnEnd はメッセージを返せない）
 */
export class ShieldsDownEffect implements IAbilityEffect {
  async onEntry(holder: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    await this.updateForm(holder, battleContext);
  }

  async onTurnEnd(holder: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    await this.updateForm(holder, battleContext);
  }

  private async updateForm(
    holder: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<void> {
    if (!battleContext || holder.currentHp <= 0) {
      return;
    }
    const trainedPokemon = await battleContext.trainedPokemonRepository?.findById(
      holder.trainedPokemonId,
    );
    if (trainedPokemon?.pokemon.nationalDex !== MINIOR_NATIONAL_DEX) {
      return;
    }
    const form = holder.currentHp * 2 <= holder.maxHp ? CORE_FORM : null;
    await changeForm(holder, form, battleContext);
  }
}
