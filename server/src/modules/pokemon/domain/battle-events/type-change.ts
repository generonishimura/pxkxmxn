import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { TYPELESS_TYPE_NAME } from '@/modules/battle/domain/logic/effective-traits';
import { BattleContext } from '../abilities/battle-context.interface';

/**
 * タイプを変えられないポケモンの全国図鑑の番号（アルセウス・シルヴァディ。本家の setType）
 */
const TYPE_LOCKED_NATIONAL_DEX = [493, 773] as const;

/**
 * すべてのタイプ名（DB の Type.name。テクスチャー２が、技を半減以下にするタイプを探すのに使う）
 */
export const ALL_TYPE_NAMES = [
  'ノーマル',
  'ほのお',
  'みず',
  'でんき',
  'くさ',
  'こおり',
  'かくとう',
  'どく',
  'じめん',
  'ひこう',
  'エスパー',
  'むし',
  'いわ',
  'ゴースト',
  'ドラゴン',
  'あく',
  'はがね',
  'フェアリー',
] as const;

/**
 * ポケモンのタイプを書き換える（本家の setType）。volatileState.typeOverride を書き、addedType を消す
 * みずびたし・まほうのこな・テクスチャー・テクスチャー２・ミラータイプ・ほごしょく・へんしょく・へんげんじざい・リベロ・
 * ぎたい・もえつきる（ほのおを TYPELESS_TYPE_NAME に）・でんこうそうげき が使う
 *
 * 次のときは書き換えずに false を返す
 * - ひんし
 * - アルセウス・シルヴァディ（全国図鑑 493・773）
 *
 * 「すでに同じタイプなら失敗」（みずびたしなど）は、呼ぶ側で resolveTypeNames を見て判定する
 * @param typeNames タイプ名（DB の Type.name）。タイプなしは TYPELESS_TYPE_NAME
 */
export const setTypes = async (
  target: BattlePokemonStatus,
  typeNames: readonly string[],
  battleContext: BattleContext,
): Promise<boolean> => {
  if (target.currentHp <= 0 || typeNames.length === 0 || !battleContext.battleRepository) {
    return false;
  }
  const trainedPokemon = await battleContext.trainedPokemonRepository?.findById(
    target.trainedPokemonId,
  );
  const nationalDex = trainedPokemon?.pokemon.nationalDex;
  if (
    nationalDex !== undefined &&
    (TYPE_LOCKED_NATIONAL_DEX as readonly number[]).includes(nationalDex)
  ) {
    return false;
  }
  await battleContext.battleRepository.patchVolatileState(target.id, {
    typeOverride: [...typeNames],
    addedType: null,
  });
  return true;
};

/**
 * 3 つめのタイプを足す（本家の addType）。前に足したタイプは置き換える
 * ハロウィン（ゴースト）・もりののろい（くさ）が使う。「すでにそのタイプなら失敗」は呼ぶ側で hasType を見て判定する
 * @returns ひんしなら false
 */
export const addType = async (
  target: BattlePokemonStatus,
  typeName: string,
  battleContext: BattleContext,
): Promise<boolean> => {
  if (target.currentHp <= 0 || !battleContext.battleRepository) {
    return false;
  }
  await battleContext.battleRepository.patchVolatileState(target.id, { addedType: typeName });
  return true;
};

/**
 * 技のタイプ（attackTypeName）を半減以下にする（相性 0 を含む）タイプ名を、ALL_TYPE_NAMES の順に返す
 * テクスチャー２が使う（使用者がすでに持つタイプを除くのは呼ぶ側）。タイプなしの技なら空
 */
export const findResistingTypeNames = async (
  attackTypeName: string,
  deps: Pick<BattleContext, 'typeEffectivenessRepository'>,
): Promise<string[]> => {
  const repository = deps.typeEffectivenessRepository;
  if (!repository || attackTypeName === TYPELESS_TYPE_NAME) {
    return [];
  }
  const attackType = await repository.findTypeByName(attackTypeName);
  if (!attackType) {
    return [];
  }
  const chart = await repository.getTypeEffectivenessMap();
  const resisting: string[] = [];
  for (const name of ALL_TYPE_NAMES) {
    const type = await repository.findTypeByName(name);
    const multiplier = type ? chart.get(`${attackType.id}-${type.id}`) : undefined;
    if (multiplier !== undefined && multiplier < 1) {
      resisting.push(name);
    }
  }
  return resisting;
};
