import { PrismaClient } from '../generated/prisma/client';
import {
  buildTypeEffectivenessMatrix,
  createAbilitySeedData,
  createMoveSeedData,
  createPokemonSeedData,
  createTypeSeedData,
  PokemonSeedData,
  TypeSeedData,
} from './seed-utils/data-mapper';
import { getAbilityMetadata } from './seed-utils/ability-mapping';
import { PokeApiClient } from './seed-utils/pokeapi-client';

const prisma = new PrismaClient();
const pokeApi = new PokeApiClient();

const EXCLUDED_TYPE_NAMES = new Set(['unknown', 'shadow']);
const TYPE_LIST_LIMIT = 100;
const DEFAULT_POKEMON_LIMIT = 151;
const DEFAULT_MOVE_LIMIT = 200;
const DEFAULT_ABILITY_LIMIT = 100;

const parseLimit = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const POKEMON_LIMIT = parseLimit(process.env.SEED_POKEMON_LIMIT, DEFAULT_POKEMON_LIMIT);
const MOVE_LIMIT = parseLimit(process.env.SEED_MOVE_LIMIT, DEFAULT_MOVE_LIMIT);
const ABILITY_LIMIT = parseLimit(process.env.SEED_ABILITY_LIMIT, DEFAULT_ABILITY_LIMIT);

interface TypeSeedResult {
  typeMap: Map<string, number>;
  typeSeeds: TypeSeedData[];
}

async function main(): Promise<void> {
  try {
    console.log('Start seeding master data from PokeAPI...');

    const { typeMap, typeSeeds } = await seedTypes();
    await seedTypeEffectiveness(typeSeeds, typeMap);
    await seedPokemon(typeMap);
    await seedMoves(typeMap);
    await seedAbilities();

    console.log('Seed completed successfully.');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

const filterCanonicalTypes = (types: TypeSeedData[]): TypeSeedData[] =>
  types.filter((type) => !EXCLUDED_TYPE_NAMES.has(type.apiName));

async function seedTypes(): Promise<TypeSeedResult> {
  console.log('Seeding Types...');
  const list = await pokeApi.fetchTypeList(TYPE_LIST_LIMIT, 0);
  const seeds: TypeSeedData[] = [];

  for (const resource of list.results) {
    if (EXCLUDED_TYPE_NAMES.has(resource.name)) {
      continue;
    }
    const type = await pokeApi.fetchType(resource.name);
    if (EXCLUDED_TYPE_NAMES.has(type.name)) {
      continue;
    }
    seeds.push(createTypeSeedData(type));
  }

  const canonicalTypes = filterCanonicalTypes(seeds).sort((a, b) =>
    a.apiName.localeCompare(b.apiName),
  );

  const typeMap = new Map<string, number>();
  for (const type of canonicalTypes) {
    const record = await prisma.type.upsert({
      where: { nameEn: type.nameEn },
      update: { name: type.name },
      create: {
        name: type.name,
        nameEn: type.nameEn,
      },
    });
    typeMap.set(type.apiName, record.id);
  }

  console.log(`Seeded ${canonicalTypes.length} types.`);
  return { typeMap, typeSeeds: canonicalTypes };
}

async function seedTypeEffectiveness(
  typeSeeds: TypeSeedData[],
  typeMap: Map<string, number>,
): Promise<void> {
  console.log('Seeding Type Effectiveness...');
  const relations = buildTypeEffectivenessMatrix(typeSeeds);

  for (const relation of relations) {
    const attackerId = typeMap.get(relation.attackerTypeName);
    const defenderId = typeMap.get(relation.defenderTypeName);

    if (!attackerId || !defenderId) {
      console.warn(
        `Skip effectiveness ${relation.attackerTypeName} -> ${relation.defenderTypeName}: missing type id`,
      );
      continue;
    }

    await prisma.typeEffectiveness.upsert({
      where: {
        typeFromId_typeToId: {
          typeFromId: attackerId,
          typeToId: defenderId,
        },
      },
      update: {
        effectiveness: relation.effectiveness,
      },
      create: {
        typeFromId: attackerId,
        typeToId: defenderId,
        effectiveness: relation.effectiveness,
      },
    });
  }

  console.log(`Seeded ${relations.length} type effectiveness rows.`);
}

async function seedPokemon(typeMap: Map<string, number>): Promise<void> {
  console.log(`Seeding Pokemon (limit: ${POKEMON_LIMIT})...`);
  const list = await pokeApi.fetchPokemonList(POKEMON_LIMIT, 0);

  for (const resource of list.results) {
    const pokemon = await pokeApi.fetchPokemon(resource.name);
    const species = await pokeApi.fetchPokemonSpecies(resource.name);
    const seed = createPokemonSeedData(pokemon, species);
    await upsertPokemon(seed, typeMap);
  }

  console.log(`Seeded ${list.results.length} pokemon.`);
}

const upsertPokemon = async (
  seed: PokemonSeedData,
  typeMap: Map<string, number>,
): Promise<void> => {
  const primaryTypeId = typeMap.get(seed.primaryTypeName);
  if (!primaryTypeId) {
    throw new Error(`Type ${seed.primaryTypeName} not found for pokemon ${seed.nameEn}`);
  }

  const secondaryTypeId = seed.secondaryTypeName
    ? typeMap.get(seed.secondaryTypeName)
    : undefined;

  await prisma.pokemon.upsert({
    where: { nationalDex: seed.nationalDex },
    update: {
      name: seed.name,
      nameEn: seed.nameEn,
      primaryTypeId,
      secondaryTypeId: secondaryTypeId ?? null,
      baseHp: seed.stats.baseHp,
      baseAttack: seed.stats.baseAttack,
      baseDefense: seed.stats.baseDefense,
      baseSpecialAttack: seed.stats.baseSpecialAttack,
      baseSpecialDefense: seed.stats.baseSpecialDefense,
      baseSpeed: seed.stats.baseSpeed,
    },
    create: {
      nationalDex: seed.nationalDex,
      name: seed.name,
      nameEn: seed.nameEn,
      primaryTypeId,
      secondaryTypeId: secondaryTypeId ?? null,
      baseHp: seed.stats.baseHp,
      baseAttack: seed.stats.baseAttack,
      baseDefense: seed.stats.baseDefense,
      baseSpecialAttack: seed.stats.baseSpecialAttack,
      baseSpecialDefense: seed.stats.baseSpecialDefense,
      baseSpeed: seed.stats.baseSpeed,
    },
  });
};

async function seedMoves(typeMap: Map<string, number>): Promise<void> {
  console.log(`Seeding Moves (limit: ${MOVE_LIMIT})...`);
  const list = await pokeApi.fetchMoveList(MOVE_LIMIT, 0);

  for (const resource of list.results) {
    const move = await pokeApi.fetchMove(resource.name);
    const seed = createMoveSeedData(move);
    const typeId = typeMap.get(seed.typeName);
    if (!typeId) {
      console.warn(`Skip move ${seed.nameEn}: missing type ${seed.typeName}`);
      continue;
    }

    await prisma.move.upsert({
      where: { nameEn: seed.nameEn },
      update: {
        name: seed.name,
        typeId,
        category: seed.category,
        power: seed.power,
        accuracy: seed.accuracy,
        pp: seed.pp,
        priority: seed.priority,
        description: seed.description,
      },
      create: {
        name: seed.name,
        nameEn: seed.nameEn,
        typeId,
        category: seed.category,
        power: seed.power,
        accuracy: seed.accuracy,
        pp: seed.pp,
        priority: seed.priority,
        description: seed.description,
      },
    });
  }

  console.log(`Seeded ${list.results.length} moves.`);
}

async function seedAbilities(): Promise<void> {
  console.log(`Seeding Abilities (limit: ${ABILITY_LIMIT})...`);
  const list = await pokeApi.fetchAbilityList(ABILITY_LIMIT, 0);

  for (const resource of list.results) {
    const ability = await pokeApi.fetchAbility(resource.name);
    const seed = createAbilitySeedData(ability);
    const metadata = getAbilityMetadata(seed.name);

    await prisma.ability.upsert({
      where: { nameEn: seed.nameEn },
      update: {
        name: seed.name,
        description: seed.description,
        triggerEvent: metadata.triggerEvent,
        effectCategory: metadata.effectCategory,
      },
      create: {
        name: seed.name,
        nameEn: seed.nameEn,
        description: seed.description,
        triggerEvent: metadata.triggerEvent,
        effectCategory: metadata.effectCategory,
      },
    });
  }

  console.log(`Seeded ${list.results.length} abilities.`);
}

void main();

