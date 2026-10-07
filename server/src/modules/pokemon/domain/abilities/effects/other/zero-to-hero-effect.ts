import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { changeForm } from '../../../battle-events/form-change';

/**
 * マイティチェンジ（Zero to Hero）特性の効果
 * 場から下がるとき、イルカマンをナイーブフォルムからマイティフォルムに変える（本家の onSwitchOut）。
 * マイティフォルムは交代しても残るフォルム（persistentState.form の 'hero'）なので、次に場に出たときから
 * マイティフォルムのタイプと種族値になり、バトルの終わりまで戻らない。
 * イルカマン（全国図鑑 964）でないとき・すでにマイティフォルム・へんしん中・ひんしは変えない（changeForm が false を返す）
 * 注: マイティフォルムで場に出たときのメッセージ（本家の -activate）は出さない
 */
export class ZeroToHeroEffect implements IAbilityEffect {
  private static readonly PALAFIN_NATIONAL_DEX = 964;
  private static readonly HERO_FORM = 'hero';

  async onSwitchOut(holder: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    if (!battleContext) {
      return;
    }
    const trainedPokemon = await battleContext.trainedPokemonRepository?.findById(
      holder.trainedPokemonId,
    );
    if (trainedPokemon?.pokemon.nationalDex !== ZeroToHeroEffect.PALAFIN_NATIONAL_DEX) {
      return;
    }
    await changeForm(holder, ZeroToHeroEffect.HERO_FORM, battleContext, { persistent: true });
  }
}
