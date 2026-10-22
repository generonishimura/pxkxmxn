import { Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { MoveRegistry } from '../move-registry';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { AttractEffect } from './attract-effect';

describe('AttractEffect（メロメロ）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('onUse', () => {
    it('性別が違う相手に infatuatedWithStatusId（使用者の ID）を書く', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { gender: Gender.Male },
        { gender: Gender.Female },
      );
      const effect = new AttractEffect();

      // Act
      const result = await effect.onUse(get(1), get(2), context({ moveName: 'メロメロ' }));

      // Assert
      expect(get(2).volatileState.infatuatedWithStatusId).toBe(1);
      expect(result).toBe('fell in love!');
    });

    it('同じ性別の相手には失敗する', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { gender: Gender.Female },
        { gender: Gender.Female },
      );
      const effect = new AttractEffect();

      // Act
      const result = await effect.onUse(get(1), get(2), context({ moveName: 'メロメロ' }));

      // Assert
      expect(get(2).volatileState.infatuatedWithStatusId).toBeUndefined();
      expect(result).toBe('But it failed');
    });

    it('性別不明の相手には失敗する', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { gender: Gender.Male },
        { gender: Gender.Genderless },
      );
      const effect = new AttractEffect();

      // Act
      const result = await effect.onUse(get(1), get(2), context({ moveName: 'メロメロ' }));

      // Assert
      expect(get(2).volatileState.infatuatedWithStatusId).toBeUndefined();
      expect(result).toBe('But it failed');
    });

    it('相手がすでにメロメロなら失敗する', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle(
        { gender: Gender.Male },
        { gender: Gender.Female, status: { volatileState: { infatuatedWithStatusId: 1 } } },
      );
      const effect = new AttractEffect();

      // Act
      const result = await effect.onUse(get(1), get(2), context({ moveName: 'メロメロ' }));

      // Assert
      expect(battleRepository.patchVolatileState).not.toHaveBeenCalled();
      expect(result).toBe('But it failed');
    });

    it('相手の特性が どんかん なら失敗する', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { gender: Gender.Male },
        { gender: Gender.Female, ability: 'どんかん' },
      );
      const effect = new AttractEffect();

      // Act
      const result = await effect.onUse(get(1), get(2), context({ moveName: 'メロメロ' }));

      // Assert
      expect(get(2).volatileState.infatuatedWithStatusId).toBeUndefined();
      expect(result).toBe('But it failed');
    });
  });

  describe('登録', () => {
    it('「メロメロ」は AttractEffect として登録されている', () => {
      // Arrange
      MoveRegistry.clear();
      MoveRegistry.initialize();

      // Act
      const effect = MoveRegistry.get('メロメロ');

      // Assert
      expect(effect).toBeInstanceOf(AttractEffect);
    });
  });
});
