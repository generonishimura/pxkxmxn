import { createAbilitySeedData, createMoveSeedData } from '../../../prisma/seed-utils/data-mapper';
import {
  PokeApiAbilityResponse,
  PokeApiMoveResponse,
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
});
