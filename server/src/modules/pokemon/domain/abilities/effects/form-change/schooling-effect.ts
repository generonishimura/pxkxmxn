import { IAbilityEffect } from '../../ability-effect.interface';
import { BattleContext } from '../../battle-context.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { changeForm } from '../../../battle-events/form-change';

/** ヨワシの全国図鑑の番号 */
const WISHIWASHI_NATIONAL_DEX = 746;
/** むれたすがたになれる最低のレベル */
const SCHOOLING_MIN_LEVEL = 20;

/**
 * ぎょぐん（Schooling）特性の効果
 * レベル 20 以上のヨワシが、場に出たとき（onEntry）とターン終了時（onTurnEnd）に、HP が最大 HP の 1/4 より上なら
 * むれたすがた（'school'）になり、1/4 以下ならたんどくのすがた（null。既定の 'solo'）に戻る。
 * フォルムは交代で戻る（volatileState.form）。へんしん中・ヨワシでない・レベル 20 未満なら何もしない
 * 注: フォルムが変わったメッセージは出ない（onEntry・onTurnEnd はメッセージを返せない）
 */
export class SchoolingEffect implements IAbilityEffect {
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
    if (
      !trainedPokemon ||
      trainedPokemon.pokemon.nationalDex !== WISHIWASHI_NATIONAL_DEX ||
      trainedPokemon.level < SCHOOLING_MIN_LEVEL
    ) {
      return;
    }
    const form = holder.currentHp * 4 > holder.maxHp ? 'school' : null;
    await changeForm(holder, form, battleContext);
  }
}
