import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * ポケモンの種類（全国図鑑の番号）が合っているか（フォルムを変える特性が、本家と同じくそのポケモンのときだけ動くように使う）
 * 本家の species.id の判定にあたる。DB は全国図鑑の番号ごとに 1 行なので、番号で判定する
 * 育成ポケモンを読めないとき（リポジトリがない）は判定できないので true を返す
 * （これらの特性はなりきり・スキルスワップなどで写せず、そのポケモンしか持たない）
 * @param holder 判定するポケモン
 * @param nationalDex 全国図鑑の番号（ミミッキュなら 778）
 */
export const isSpecies = async (
  holder: BattlePokemonStatus,
  nationalDex: number,
  battleContext: BattleContext,
): Promise<boolean> => {
  if (!battleContext.trainedPokemonRepository) {
    return true;
  }
  const trainedPokemon = await battleContext.trainedPokemonRepository.findById(
    holder.trainedPokemonId,
  );
  return trainedPokemon?.pokemon.nationalDex === nationalDex;
};
