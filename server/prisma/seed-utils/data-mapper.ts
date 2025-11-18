type MoveCategoryValue = 'Physical' | 'Special' | 'Status';
import {
  PokeApiAbilityResponse,
  PokeApiMoveResponse,
  PokeApiPokemonResponse,
  PokeApiPokemonSpeciesResponse,
  PokeApiTypeResponse,
} from './pokeapi-client';

const JAPANESE_LANGUAGE_CODES = ['ja-Hrkt', 'ja'];
const JAPANESE_DESCRIPTION_CODES = ['ja-Hrkt', 'ja', 'ja-Kana'];
const ENGLISH_LANGUAGE_CODE = 'en';

export interface TypeSeedData {
  apiName: string;
  name: string;
  nameEn: string;
  damageRelations: PokeApiTypeResponse['damage_relations'];
}

export interface PokemonSeedData {
  nationalDex: number;
  name: string;
  nameEn: string;
  primaryTypeName: string;
  secondaryTypeName?: string;
  stats: {
    baseHp: number;
    baseAttack: number;
    baseDefense: number;
    baseSpecialAttack: number;
    baseSpecialDefense: number;
    baseSpeed: number;
  };
}

export interface MoveSeedData {
  name: string;
  nameEn: string;
  typeName: string;
  category: MoveCategoryValue;
  power: number | null;
  accuracy: number | null;
  pp: number;
  priority: number;
  description: string | null;
}

export interface AbilitySeedData {
  name: string;
  nameEn: string;
  description: string;
}

export interface TypeEffectivenessSeedData {
  attackerTypeName: string;
  defenderTypeName: string;
  effectiveness: number;
}

export interface PokemonAbilitySeedData {
  abilityNameEn: string; // DBのAbilityテーブルとマッチングするための英語名
  isHidden: boolean;
}

export interface PokemonMoveSeedData {
  moveNameEn: string; // DBのMoveテーブルとマッチングするための英語名
  level: number | null; // 何レベルで覚えるか（nullの場合は進化前から覚えられる等）
  method: string | null; // 覚え方（"level-up", "machine", "egg", "tutor"など）
}

export const createTypeSeedData = (
  type: PokeApiTypeResponse,
): TypeSeedData => ({
  apiName: type.name,
  name: extractLocalizedName(type.names, type.name),
  nameEn: toTitleCase(type.name),
  damageRelations: type.damage_relations,
});

export const createPokemonSeedData = (
  pokemon: PokeApiPokemonResponse,
  species: PokeApiPokemonSpeciesResponse,
): PokemonSeedData => {
  const typesBySlot = new Map(
    pokemon.types.map((entry) => [entry.slot, entry.type.name]),
  );

  return {
    nationalDex: species.id,
    name: extractLocalizedName(species.names, species.name),
    nameEn: toTitleCase(pokemon.name),
    primaryTypeName: typesBySlot.get(1)!,
    secondaryTypeName: typesBySlot.get(2) ?? undefined,
    stats: {
      baseHp: getStatValue(pokemon, 'hp'),
      baseAttack: getStatValue(pokemon, 'attack'),
      baseDefense: getStatValue(pokemon, 'defense'),
      baseSpecialAttack: getStatValue(pokemon, 'special-attack'),
      baseSpecialDefense: getStatValue(pokemon, 'special-defense'),
      baseSpeed: getStatValue(pokemon, 'speed'),
    },
  };
};

export const createMoveSeedData = (
  move: PokeApiMoveResponse,
): MoveSeedData => ({
  name: extractLocalizedName(move.names, move.name),
  nameEn: toTitleCase(move.name),
  typeName: move.type.name,
  category: mapMoveCategory(move.damage_class.name),
  power: move.power,
  accuracy: move.accuracy,
  pp: move.pp ?? 1,
  priority: move.priority,
  description: extractDescription(move.effect_entries),
});

export const createAbilitySeedData = (
  ability: PokeApiAbilityResponse,
): AbilitySeedData => ({
  name: extractLocalizedName(ability.names, ability.name),
  nameEn: toTitleCase(ability.name),
  description: extractDescription(ability.effect_entries) ?? '',
});

export const buildTypeEffectivenessMatrix = (
  typeSeeds: TypeSeedData[],
): TypeEffectivenessSeedData[] => {
  const typeNames = typeSeeds.map((type) => type.apiName);
  return typeSeeds.flatMap((type) => {
    const effectivenessMap = new Map<string, number>();
    typeNames.forEach((targetName) => effectivenessMap.set(targetName, 1));

    setEffectiveness(type.damageRelations.no_damage_to, effectivenessMap, 0);
    setEffectiveness(type.damageRelations.half_damage_to, effectivenessMap, 0.5);
    setEffectiveness(
      type.damageRelations.double_damage_to,
      effectivenessMap,
      2,
    );

    return Array.from(effectivenessMap.entries()).map(
      ([defenderTypeName, effectiveness]) => ({
        attackerTypeName: type.apiName,
        defenderTypeName,
        effectiveness,
      }),
    );
  });
};

const setEffectiveness = (
  relations: PokeApiTypeResponse['damage_relations']['double_damage_to'],
  map: Map<string, number>,
  value: number,
) => {
  relations.forEach((resource) => {
    map.set(resource.name, value);
  });
};

const extractLocalizedName = (
  names: Array<{ language: { name: string }; name: string }>,
  fallback: string,
): string => {
  for (const lang of JAPANESE_LANGUAGE_CODES) {
    const match = names.find((entry) => entry.language.name === lang);
    if (match) {
      return match.name;
    }
  }
  const english = names.find((entry) => entry.language.name === ENGLISH_LANGUAGE_CODE);
  if (english) {
    return english.name;
  }
  return toTitleCase(fallback);
};

const extractDescription = (
  entries: Array<{ language: { name: string }; short_effect: string }>,
): string | null => {
  for (const lang of JAPANESE_DESCRIPTION_CODES) {
    const match = entries.find((entry) => entry.language.name === lang);
    if (match) {
      return match.short_effect;
    }
  }
  const english = entries.find((entry) => entry.language.name === ENGLISH_LANGUAGE_CODE);
  return english?.short_effect ?? null;
};

const getStatValue = (
  pokemon: PokeApiPokemonResponse,
  statName:
    | 'hp'
    | 'attack'
    | 'defense'
    | 'special-attack'
    | 'special-defense'
    | 'speed',
): number => {
  const stat = pokemon.stats.find((entry) => entry.stat.name === statName);
  if (!stat) {
    throw new Error(`Stat ${statName} not found for pokemon ${pokemon.name}`);
  }
  return stat.base_stat;
};

const toTitleCase = (value: string): string =>
  value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);

const mapMoveCategory = (category: string): MoveCategoryValue => {
  switch (category) {
    case 'physical':
      return 'Physical';
    case 'special':
      return 'Special';
    default:
      return 'Status';
  }
};

/**
 * PokeAPIの特性データからPokemonAbilitySeedDataを作成
 */
export const createPokemonAbilitySeedData = (
  abilityEntry: PokeApiPokemonResponse['abilities'][number],
): PokemonAbilitySeedData => ({
  abilityNameEn: toTitleCase(abilityEntry.ability.name),
  isHidden: abilityEntry.is_hidden,
});

/**
 * PokeAPIの技データからPokemonMoveSeedDataを作成
 * 最新のバージョングループ（scarlet-violet）の情報を使用
 */
export const createPokemonMoveSeedData = (
  moveEntry: PokeApiPokemonResponse['moves'][number],
): PokemonMoveSeedData[] => {
  // 最新のバージョングループ（scarlet-violet）を優先的に使用
  // 見つからない場合は最初のエントリを使用
  const selectedVersionGroup = moveEntry.version_group_details.find(
    (detail) => detail.version_group.name === 'scarlet-violet',
  ) ?? moveEntry.version_group_details[0];

  if (!selectedVersionGroup) {
    // version_group_detailsが空の場合は、methodとlevelをnullとして返す
    return [
      {
        moveNameEn: toTitleCase(moveEntry.move.name),
        level: null,
        method: null,
      },
    ];
  }

  // 同じ技でも複数の覚え方がある場合があるため、配列で返す
  // ただし、同じmethodとlevelの組み合わせは1つだけにする
  const uniqueEntries = new Map<string, PokemonMoveSeedData>();
  for (const detail of moveEntry.version_group_details) {
    // 最新のバージョングループのみを使用（scarlet-violet）
    if (detail.version_group.name !== 'scarlet-violet') {
      continue;
    }

    const method = mapMoveLearnMethod(detail.move_learn_method.name);
    const key = `${method}-${detail.level_learned_at}`;
    if (!uniqueEntries.has(key)) {
      uniqueEntries.set(key, {
        moveNameEn: toTitleCase(moveEntry.move.name),
        // level_learned_atが0の場合はnullに変換
        // 0は「進化前から覚えられる」ことを意味し、nullで表現する
        // nullは「version_group_detailsが空の場合」や「該当する覚え方がない場合」も意味する
        level: detail.level_learned_at === 0 ? null : detail.level_learned_at,
        method,
      });
    }
  }

  // エントリがない場合は、methodとlevelをnullとして返す
  if (uniqueEntries.size === 0) {
    return [
      {
        moveNameEn: toTitleCase(moveEntry.move.name),
        level: null,
        method: null,
      },
    ];
  }

  return Array.from(uniqueEntries.values());
};

/**
 * PokeAPIのmove_learn_method名をDBのmethod形式に変換
 */
const mapMoveLearnMethod = (method: string): string | null => {
  switch (method) {
    case 'level-up':
      return 'level_up';
    case 'machine':
      return 'tm';
    case 'egg':
      return 'egg';
    case 'tutor':
      return 'tutor';
    default:
      return null;
  }
};

