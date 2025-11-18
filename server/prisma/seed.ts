import { PrismaClient } from '../generated/prisma/client';
import {
  buildTypeEffectivenessMatrix,
  createAbilitySeedData,
  createMoveSeedData,
  createPokemonAbilitySeedData,
  createPokemonMoveSeedData,
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

/**
 * 環境変数から制限値を取得
 * 0または未指定の場合は全件取得（PokeAPIのcountを使用）
 */
const parseLimit = (value: string | undefined): number | null => {
  if (!value) {
    return null; // 全件取得
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null; // 無効な値の場合は全件取得
  }
  return parsed;
};

const POKEMON_LIMIT = parseLimit(process.env.SEED_POKEMON_LIMIT);
const MOVE_LIMIT = parseLimit(process.env.SEED_MOVE_LIMIT);
const ABILITY_LIMIT = parseLimit(process.env.SEED_ABILITY_LIMIT);

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
    await seedPokemonAbilities();
    await seedPokemonMoves();

    console.log('Seed completed successfully.');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

const filterCanonicalTypes = (types: TypeSeedData[]): TypeSeedData[] =>
  types.filter(type => !EXCLUDED_TYPE_NAMES.has(type.apiName));

async function seedTypes(): Promise<TypeSeedResult> {
  console.log('Seeding Types...');
  // まず総数を取得
  const initialList = await pokeApi.fetchTypeList(1, 0);
  const totalCount = initialList.count;
  const list = await pokeApi.fetchTypeList(totalCount, 0);
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

  console.log(`Seeded ${canonicalTypes.length} types (${totalCount} total in API).`);
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
  // まず総数を取得
  const initialList = await pokeApi.fetchPokemonList(1, 0);
  const totalCount = initialList.count;
  const limit = POKEMON_LIMIT ?? totalCount;
  const actualLimit = Math.min(limit, totalCount);

  console.log(`Seeding Pokemon (${actualLimit} / ${totalCount} total)...`);

  // ページネーションで全件取得
  let offset = 0;
  let processed = 0;
  const batchSize = 100; // 一度に取得する件数

  while (processed < actualLimit) {
    const currentBatchSize = Math.min(batchSize, actualLimit - processed);
    const list = await pokeApi.fetchPokemonList(currentBatchSize, offset);

    for (const resource of list.results) {
      try {
        const pokemon = await pokeApi.fetchPokemon(resource.name);
        // pokemon-speciesのURLからIDを抽出（例: "https://pokeapi.co/api/v2/pokemon-species/386/" -> 386）
        const speciesUrl = pokemon.species.url;
        const speciesIdMatch = speciesUrl.match(/\/pokemon-species\/(\d+)\//);
        if (!speciesIdMatch) {
          console.warn(`\n  Skip ${resource.name}: cannot extract species ID from ${speciesUrl}`);
          processed++;
          continue;
        }
        const speciesId = parseInt(speciesIdMatch[1], 10);
        const species = await pokeApi.fetchPokemonSpecies(speciesId);
        const seed = createPokemonSeedData(pokemon, species);
        await upsertPokemon(seed, typeMap);
        processed++;

        if (processed % 10 === 0) {
          process.stdout.write(`\r  Progress: ${processed}/${actualLimit}`);
        }
      } catch (error) {
        // 404エラーなどの場合は簡潔に警告のみ表示
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status === 404) {
            console.warn(`\n  Skip ${resource.name}: not found (404)`);
          } else {
            console.error(
              `\n  Error processing ${resource.name}:`,
              axiosError.response?.status || 'unknown error',
            );
          }
        } else {
          console.error(`\n  Error processing ${resource.name}:`, error);
        }
        processed++; // エラーでもカウントして続行
      }
    }

    offset += list.results.length;
    if (list.results.length === 0 || offset >= actualLimit) {
      break;
    }
  }

  console.log(`\nSeeded ${processed} pokemon.`);
}

const upsertPokemon = async (
  seed: PokemonSeedData,
  typeMap: Map<string, number>,
): Promise<void> => {
  const primaryTypeId = typeMap.get(seed.primaryTypeName);
  if (!primaryTypeId) {
    throw new Error(`Type ${seed.primaryTypeName} not found for pokemon ${seed.nameEn}`);
  }

  const secondaryTypeId = seed.secondaryTypeName ? typeMap.get(seed.secondaryTypeName) : undefined;

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
  // まず総数を取得
  const initialList = await pokeApi.fetchMoveList(1, 0);
  const totalCount = initialList.count;
  const limit = MOVE_LIMIT ?? totalCount;
  const actualLimit = Math.min(limit, totalCount);

  console.log(`Seeding Moves (${actualLimit} / ${totalCount} total)...`);

  // ページネーションで全件取得
  let offset = 0;
  let processed = 0;
  let skipped = 0;
  const batchSize = 100;

  while (processed + skipped < actualLimit) {
    const currentBatchSize = Math.min(batchSize, actualLimit - processed - skipped);
    const list = await pokeApi.fetchMoveList(currentBatchSize, offset);

    for (const resource of list.results) {
      try {
        const move = await pokeApi.fetchMove(resource.name);
        const seed = createMoveSeedData(move);
        const typeId = typeMap.get(seed.typeName);
        if (!typeId) {
          console.warn(`\n  Skip move ${seed.nameEn}: missing type ${seed.typeName}`);
          skipped++;
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
        processed++;

        if (processed % 10 === 0) {
          process.stdout.write(`\r  Progress: ${processed}/${actualLimit}`);
        }
      } catch (error) {
        // Prismaのユニーク制約違反（重複エラー）の場合は警告のみ
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
          console.warn(`\n  Skip move ${resource.name}: duplicate name (already exists)`);
          skipped++;
        } else if (error && typeof error === 'object' && 'response' in error) {
          // 404エラーなどの場合は簡潔に警告のみ表示
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status === 404) {
            console.warn(`\n  Skip move ${resource.name}: not found (404)`);
          } else {
            console.error(
              `\n  Error processing move ${resource.name}:`,
              axiosError.response?.status || 'unknown error',
            );
          }
          skipped++;
        } else {
          console.error(`\n  Error processing move ${resource.name}:`, error);
          skipped++;
        }
      }
    }

    offset += list.results.length;
    if (list.results.length === 0 || offset >= actualLimit) {
      break;
    }
  }

  console.log(`\nSeeded ${processed} moves${skipped > 0 ? ` (${skipped} skipped)` : ''}.`);
}

async function seedAbilities(): Promise<void> {
  // まず総数を取得
  const initialList = await pokeApi.fetchAbilityList(1, 0);
  const totalCount = initialList.count;
  const limit = ABILITY_LIMIT ?? totalCount;
  const actualLimit = Math.min(limit, totalCount);

  console.log(`Seeding Abilities (${actualLimit} / ${totalCount} total)...`);

  // ページネーションで全件取得
  let offset = 0;
  let processed = 0;
  const batchSize = 100;

  while (processed < actualLimit) {
    const currentBatchSize = Math.min(batchSize, actualLimit - processed);
    const list = await pokeApi.fetchAbilityList(currentBatchSize, offset);

    for (const resource of list.results) {
      try {
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
        processed++;

        if (processed % 10 === 0) {
          process.stdout.write(`\r  Progress: ${processed}/${actualLimit}`);
        }
      } catch (error) {
        // Prismaのユニーク制約違反（重複エラー）の場合は警告のみ
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
          console.warn(`\n  Skip ability ${resource.name}: duplicate name (already exists)`);
          processed++; // エラーでもカウントして続行
        } else if (error && typeof error === 'object' && 'response' in error) {
          // 404エラーなどの場合は簡潔に警告のみ表示
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status === 404) {
            console.warn(`\n  Skip ability ${resource.name}: not found (404)`);
          } else {
            console.error(
              `\n  Error processing ability ${resource.name}:`,
              axiosError.response?.status || 'unknown error',
            );
          }
          processed++; // エラーでもカウントして続行
        } else {
          console.error(`\n  Error processing ability ${resource.name}:`, error);
          processed++; // エラーでもカウントして続行
        }
      }
    }

    offset += list.results.length;
    if (list.results.length === 0 || offset >= actualLimit) {
      break;
    }
  }

  console.log(`\nSeeded ${processed} abilities.`);
}

async function seedPokemonAbilities(): Promise<void> {
  console.log('Seeding Pokemon Abilities...');

  // 既存のPokemonデータを取得
  const pokemons = await prisma.pokemon.findMany({
    orderBy: { nationalDex: 'asc' },
  });

  const limit = POKEMON_LIMIT ?? pokemons.length;
  const actualLimit = Math.min(limit, pokemons.length);

  console.log(`Processing ${actualLimit} pokemon...`);

  let processed = 0;
  let totalAbilities = 0;
  let skipped = 0;

  for (let i = 0; i < actualLimit; i++) {
    const pokemon = pokemons[i];
    try {
      // PokeAPIからポケモンの詳細情報を取得（abilities情報を含む）
      const pokemonData = await pokeApi.fetchPokemon(pokemon.nameEn.toLowerCase());

      for (const abilityEntry of pokemonData.abilities) {
        try {
          const abilitySeed = createPokemonAbilitySeedData(abilityEntry);

          // DBのAbilityテーブルからnameEnで検索
          const ability = await prisma.ability.findUnique({
            where: { nameEn: abilitySeed.abilityNameEn },
          });

          if (!ability) {
            console.warn(
              `\n  Skip ability ${abilitySeed.abilityNameEn} for ${pokemon.nameEn}: not found in DB`,
            );
            skipped++;
            continue;
          }

          // PokemonAbilityテーブルにupsert
          await prisma.pokemonAbility.upsert({
            where: {
              pokemonId_abilityId: {
                pokemonId: pokemon.id,
                abilityId: ability.id,
              },
            },
            update: {
              isHidden: abilitySeed.isHidden,
            },
            create: {
              pokemonId: pokemon.id,
              abilityId: ability.id,
              isHidden: abilitySeed.isHidden,
            },
          });
          totalAbilities++;
        } catch (error) {
          console.warn(
            `\n  Error processing ability ${abilityEntry.ability.name} for ${pokemon.nameEn}:`,
            error,
          );
          skipped++;
        }
      }

      processed++;

      if (processed % 10 === 0) {
        process.stdout.write(`\r  Progress: ${processed}/${actualLimit}`);
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          console.warn(`\n  Skip ${pokemon.nameEn}: not found (404)`);
        } else {
          console.error(
            `\n  Error processing ${pokemon.nameEn}:`,
            axiosError.response?.status || 'unknown error',
          );
        }
      } else {
        console.error(`\n  Error processing ${pokemon.nameEn}:`, error);
      }
      processed++; // エラーでもカウントして続行
    }
  }

  console.log(
    `\nSeeded ${totalAbilities} pokemon abilities${skipped > 0 ? ` (${skipped} skipped)` : ''}.`,
  );
}

async function seedPokemonMoves(): Promise<void> {
  console.log('Seeding Pokemon Moves...');

  // 既存のPokemonデータを取得
  const pokemons = await prisma.pokemon.findMany({
    orderBy: { nationalDex: 'asc' },
  });

  const limit = POKEMON_LIMIT ?? pokemons.length;
  const actualLimit = Math.min(limit, pokemons.length);

  console.log(`Processing ${actualLimit} pokemon...`);

  let processed = 0;
  let totalMoves = 0;
  let skipped = 0;

  for (let i = 0; i < actualLimit; i++) {
    const pokemon = pokemons[i];
    try {
      // PokeAPIからポケモンの詳細情報を取得（moves情報を含む）
      const pokemonData = await pokeApi.fetchPokemon(pokemon.nameEn.toLowerCase());

      for (const moveEntry of pokemonData.moves) {
        try {
          const moveSeeds = createPokemonMoveSeedData(moveEntry);

          for (const moveSeed of moveSeeds) {
            // DBのMoveテーブルからnameEnで検索
            const move = await prisma.move.findUnique({
              where: { nameEn: moveSeed.moveNameEn },
            });

            if (!move) {
              console.warn(
                `\n  Skip move ${moveSeed.moveNameEn} for ${pokemon.nameEn}: not found in DB`,
              );
              skipped++;
              continue;
            }

            // PokemonMoveテーブルにupsert
            // 同じpokemonId、moveId、method、levelの組み合わせが既に存在する場合はスキップ
            const existing = await prisma.pokemonMove.findFirst({
              where: {
                pokemonId: pokemon.id,
                moveId: move.id,
                level: moveSeed.level,
                method: moveSeed.method,
              },
            });

            if (existing) {
              // 既に存在する場合はスキップ
              continue;
            }

            // 存在しない場合は作成
            await prisma.pokemonMove.create({
              data: {
                pokemonId: pokemon.id,
                moveId: move.id,
                level: moveSeed.level,
                method: moveSeed.method,
              },
            });
            totalMoves++;
          }
        } catch (error) {
          console.warn(
            `\n  Error processing move ${moveEntry.move.name} for ${pokemon.nameEn}:`,
            error,
          );
          skipped++;
        }
      }

      processed++;

      if (processed % 10 === 0) {
        process.stdout.write(`\r  Progress: ${processed}/${actualLimit}`);
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          console.warn(`\n  Skip ${pokemon.nameEn}: not found (404)`);
        } else {
          console.error(
            `\n  Error processing ${pokemon.nameEn}:`,
            axiosError.response?.status || 'unknown error',
          );
        }
      } else {
        console.error(`\n  Error processing ${pokemon.nameEn}:`, error);
      }
      processed++; // エラーでもカウントして続行
    }
  }

  console.log(
    `\nSeeded ${totalMoves} pokemon moves${skipped > 0 ? ` (${skipped} skipped)` : ''}.`,
  );
}

void main();
