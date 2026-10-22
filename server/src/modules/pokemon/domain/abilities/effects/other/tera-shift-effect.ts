import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { changeForm } from '../../../battle-events/form-change';

/**
 * テラスチェンジ（Tera Shift）特性の効果
 * 場に出たとき、テラパゴスをノーマルフォルムからテラスタルフォルムに変える（本家の onSwitchIn）。
 * テラスタルフォルムは交代しても残るフォルム（persistentState.form の 'terastal'）。
 * HP の種族値が 90 から 95 になり（減った HP は保つ）、特性がテラスシェルになる（changeForm が表の abilityName を使う）。
 * スキルスワップなどで受け取ったときは呼ばれない（SWITCH_IN_ONLY_ABILITY_NAMES）。
 * テラパゴス（全国図鑑 1024）でないとき・すでにテラスタルフォルム・へんしん中・ひんしは変えない（changeForm が false を返す）
 * バトル開始時は、ほかの特性の先発より先に変わる（StartBattleUseCase。本家の onSwitchInPriority 2）
 */
export class TeraShiftEffect implements IAbilityEffect {
  private static readonly TERAPAGOS_NATIONAL_DEX = 1024;
  private static readonly TERASTAL_FORM = 'terastal';

  async onEntry(holder: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    if (!battleContext) {
      return;
    }
    const trainedPokemon = await battleContext.trainedPokemonRepository?.findById(
      holder.trainedPokemonId,
    );
    if (trainedPokemon?.pokemon.nationalDex !== TeraShiftEffect.TERAPAGOS_NATIONAL_DEX) {
      return;
    }
    await changeForm(holder, TeraShiftEffect.TERASTAL_FORM, battleContext, { persistent: true });
  }
}
