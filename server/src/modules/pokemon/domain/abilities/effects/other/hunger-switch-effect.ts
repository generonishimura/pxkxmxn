import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { changeForm } from '../../../battle-events/form-change';

/**
 * はらぺこスイッチ（Hunger Switch）特性の効果
 * ターン終了時に、モルペコのフォルムを、まんぷくもようとはらぺこもようで交互に変える（本家の onResidual）。
 * はらぺこもようは交代で戻るフォルム（volatileState.form の 'hangry'）。まんぷくもようは既定のフォルム（null）。
 * オーラぐるまのタイプ（でんき・あく）は、オーラぐるまの効果が volatileState.form を見て決める。
 * モルペコ（全国図鑑 877）でないとき・へんしん中・ひんしは変えない（changeForm が false を返す）
 * 注: テラスタルは扱わないので、テラスタルしたモルペコで止まる判定はない
 */
export class HungerSwitchEffect implements IAbilityEffect {
  private static readonly MORPEKO_NATIONAL_DEX = 877;
  private static readonly HANGRY_FORM = 'hangry';

  async onTurnEnd(holder: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    if (!battleContext || holder.currentHp <= 0) {
      return;
    }
    const trainedPokemon = await battleContext.trainedPokemonRepository?.findById(
      holder.trainedPokemonId,
    );
    if (trainedPokemon?.pokemon.nationalDex !== HungerSwitchEffect.MORPEKO_NATIONAL_DEX) {
      return;
    }
    const nextForm =
      holder.volatileState.form === HungerSwitchEffect.HANGRY_FORM
        ? null
        : HungerSwitchEffect.HANGRY_FORM;
    await changeForm(holder, nextForm, battleContext);
  }
}
