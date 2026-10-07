import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { battleMaxHpOf } from '@/modules/battle/domain/logic/battle-pokemon-traits';
import { findPokemonForm } from '@/modules/battle/domain/logic/pokemon-forms';
import { BattleContext } from '../abilities/battle-context.interface';

/**
 * フォルムを変えるときのオプション
 * - persistent: 交代しても残るフォルム（persistentState.form）に書く。省略すると交代で戻るフォルム（volatileState.form）
 */
export interface ChangeFormOptions {
  readonly persistent?: boolean;
}

/**
 * フォルムを変える（本家の formeChange）
 * バトルスイッチ・ダルマモード・リミットシールド・ぎょぐん・ばけのかわ・アイスフェイス・はらぺこスイッチ・
 * スワームチェンジ・うのミサイル・てんきや・フラワーギフト・マイティチェンジ・テラスチェンジ が使う
 *
 * 1. volatileState.form（persistent なら persistentState.form）に書く。null なら消す（もとのフォルムに戻す）
 * 2. タイプと実数値は、pokemon-forms の表のフォルムの値になる（エンジンが読むときに求める）。
 *    本家の setSpecies と同じく、タイプの上書き（typeOverride・addedType）と実数値の上書き（statOverrides）を消す
 * 3. フォルムで HP の種族値が変わるとき（変える前と後で計算した最大 HP が違うとき）は、最大 HP を変えたあとの値にし、
 *    減った HP を保つ（本家の updateMaxHp。ひんしでなければ最低 1）
 *
 * 次のときは変えずに false を返す: ひんし・へんしん中・すでにそのフォルム
 * 特性は、交代しても残るフォルムが特性を持つときだけ変わる（表の abilityName。テラパゴスのテラスタルフォルムのテラスシェル）。
 * そのときは本家の永続の formeChange と同じく、今の特性の上書き（abilityOverride）も消す。ほかのフォルムでは特性は変えない
 * @param form フォルム名（pokemon-forms の表の form。表にないフォルムは、タイプ・実数値を変えずに名前だけ書く）
 */
export const changeForm = async (
  holder: BattlePokemonStatus,
  form: string | null,
  battleContext: BattleContext,
  options: ChangeFormOptions = {},
): Promise<boolean> => {
  const repository = battleContext.battleRepository;
  if (
    holder.currentHp <= 0 ||
    holder.volatileState.transformedIntoStatusId !== undefined ||
    !repository
  ) {
    return false;
  }
  const current = options.persistent ? holder.persistentState.form : holder.volatileState.form;
  if ((current ?? null) === form) {
    return false;
  }
  const trainedPokemon = await battleContext.trainedPokemonRepository?.findById(
    holder.trainedPokemonId,
  );
  const formAbilityName =
    options.persistent && form !== null && trainedPokemon
      ? findPokemonForm(trainedPokemon.pokemon.nationalDex, form)?.abilityName
      : undefined;
  if (options.persistent) {
    await repository.patchPersistentState(holder.id, { form });
  }
  await repository.patchVolatileState(holder.id, {
    ...(options.persistent ? {} : { form }),
    ...(formAbilityName !== undefined ? { abilityOverride: null } : {}),
    typeOverride: null,
    addedType: null,
    statOverrides: null,
  });

  if (!trainedPokemon) {
    return true;
  }
  const latest = (await repository.findBattlePokemonStatusById(holder.id)) ?? holder;
  const previousMaxHp = battleMaxHpOf(
    trainedPokemon,
    holder.volatileState.form ?? holder.persistentState.form,
  );
  const maxHp = battleMaxHpOf(
    trainedPokemon,
    latest.volatileState.form ?? latest.persistentState.form,
  );
  if (maxHp !== previousMaxHp) {
    const currentHp =
      latest.currentHp <= 0 ? 0 : Math.max(1, maxHp - (latest.maxHp - latest.currentHp));
    await repository.updateBattlePokemonStatus(holder.id, { maxHp, currentHp });
  }
  return true;
};
