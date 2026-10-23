/**
 * チャンピオンズのランクバトルのレギュレーション（使えるポケモンと持ち物）
 * 出典: https://www.serebii.net/pokemonchampions/rankedbattle.shtml
 */
export interface Regulation {
  /** レギュレーションの名前（M-A・M-B・M-C など） */
  readonly name: string;
  /** 使えるポケモンの全国図鑑の番号（Pokemon.nationalDex） */
  readonly allowedNationalDex: ReadonlySet<number>;
  /** 使える持ち物の名前（TrainedPokemon.heldItem と同じ。PokeAPI の ja-Hrkt 名。メガストーンは MEGA_EVOLUTIONS の stoneName） */
  readonly allowedItems: ReadonlySet<string>;
}
