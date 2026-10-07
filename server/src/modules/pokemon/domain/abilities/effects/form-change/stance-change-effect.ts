import { IAbilityEffect } from '../../ability-effect.interface';
import { BattleContext } from '../../battle-context.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { changeForm } from '../../../battle-events/form-change';

/** ギルガルドの全国図鑑の番号 */
const AEGISLASH_NATIONAL_DEX = 681;
/** シールドフォルムに戻す技 */
const KINGS_SHIELD_MOVE_NAME = 'キングシールド';

/**
 * バトルスイッチ（Stance Change）特性の効果
 * ギルガルドが攻撃技を出す直前にブレードフォルム（'blade'）に、キングシールドを出す直前にシールドフォルム（'shield'）になる
 * （onPrepareHit）。ほかの変化技ではフォルムは変わらない。へんしん中・ギルガルドでなければ何もしない
 * フォルムは交代で戻る（volatileState.form）。実数値はエンジンがフォルムの種族値で求め直す
 * 注: 本家は onModifyMove でフォルムを変えるので、ため技の 1 ターン目・技の onTryMove（もえつきるなど）や
 *     特性の preventsMove（しめりけなど）で失敗した技でも変わる。ここでは onPrepareHit なので、それらの技では変わらない
 */
export class StanceChangeEffect implements IAbilityEffect {
  async onPrepareHit(
    holder: BattlePokemonStatus,
    _target: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext) {
      return null;
    }
    const isKingsShield = battleContext.moveName === KINGS_SHIELD_MOVE_NAME;
    if (battleContext.moveCategory === 'Status' && !isKingsShield) {
      return null;
    }
    const form = isKingsShield ? 'shield' : 'blade';
    if ((holder.volatileState.form ?? 'shield') === form) {
      return null;
    }
    const trainedPokemon = await battleContext.trainedPokemonRepository?.findById(
      holder.trainedPokemonId,
    );
    if (trainedPokemon?.pokemon.nationalDex !== AEGISLASH_NATIONAL_DEX) {
      return null;
    }
    if (!(await changeForm(holder, form, battleContext))) {
      return null;
    }
    return isKingsShield ? 'changed to Shield Forme!' : 'changed to Blade Forme!';
  }
}
