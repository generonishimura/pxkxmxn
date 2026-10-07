import {
  createAbilitySeedData,
  createMoveSeedData,
  isDefaultPokemon,
} from '../../../prisma/seed-utils/data-mapper';
import {
  PokeApiAbilityResponse,
  PokeApiMoveResponse,
  PokeApiPokemonResponse,
} from '../../../prisma/seed-utils/pokeapi-client';

describe('data-mapper', () => {
  describe('日本語名の前後の空白', () => {
    it('技名の末尾の空白を取り除く（PokeAPI の「サイコブレイド 」）', () => {
      // Arrange
      const move: PokeApiMoveResponse = {
        id: 875,
        name: 'psyblade',
        names: [{ language: { name: 'ja-Hrkt', url: '' }, name: 'サイコブレイド ' }],
        type: { name: 'psychic', url: '' },
        accuracy: 100,
        pp: 15,
        priority: 0,
        power: 80,
        damage_class: { name: 'physical', url: '' },
        effect_entries: [],
      };

      // Act
      const seed = createMoveSeedData(move);

      // Assert
      expect(seed.name).toBe('サイコブレイド');
    });

    it('特性名の前後の空白を取り除く', () => {
      // Arrange
      const ability: PokeApiAbilityResponse = {
        id: 1,
        name: 'stench',
        names: [{ language: { name: 'ja-Hrkt', url: '' }, name: ' あくしゅう ' }],
        effect_entries: [],
      };

      // Act
      const seed = createAbilitySeedData(ability);

      // Assert
      expect(seed.name).toBe('あくしゅう');
    });
  });
  describe('既定のすがた（isDefaultPokemon）', () => {
    const pokemonOf = (name: string, isDefault: boolean): PokeApiPokemonResponse => ({
      id: 1,
      name,
      is_default: isDefault,
      species: { name: 'aegislash', url: 'https://pokeapi.co/api/v2/pokemon-species/681/' },
      stats: [],
      types: [],
      abilities: [],
      moves: [],
    });

    it('既定のすがた（ギルガルドのシールドフォルム）は入れる', () => {
      // Arrange
      const pokemon = pokemonOf('aegislash-shield', true);

      // Act
      const result = isDefaultPokemon(pokemon);

      // Assert
      expect(result).toBe(true);
    });

    it('別のすがた（ギルガルドのブレードフォルム）は入れない（全国図鑑の番号で上書きしないように）', () => {
      // Arrange
      const pokemon = pokemonOf('aegislash-blade', false);

      // Act
      const result = isDefaultPokemon(pokemon);

      // Assert
      expect(result).toBe(false);
    });
  });
});
