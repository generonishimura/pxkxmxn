import { HadronEngineEffect } from './hadron-engine-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import {
  Battle,
  BattleStatus,
  Field,
  Weather,
} from '@/modules/battle/domain/entities/battle.entity';

describe('HadronEngineEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createBattle = (field: Field): Battle =>
    new Battle(1, 1, 2, 1, 2, 1, Weather.None, field, BattleStatus.Active, null);

  const createDamageCtx = (
    field: Field | null,
    moveCategory?: 'Physical' | 'Special' | 'Status',
  ): BattleContext => ({
    battle: createBattle(Field.None),
    field,
    moveCategory,
  });

  let effect: HadronEngineEffect;

  beforeEach(() => {
    effect = new HadronEngineEffect();
  });

  describe('onEntry', () => {
    it('場に出たときエレキフィールドを展開する', async () => {
      // Arrange
      const mockBattleRepository = { update: jest.fn().mockResolvedValue(undefined) };
      const ctx: BattleContext = {
        battle: createBattle(Field.None),
        battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
      };

      // Act
      await effect.onEntry(pokemon, ctx);

      // Assert
      expect(mockBattleRepository.update).toHaveBeenCalledWith(1, {
        field: Field.ElectricTerrain,
      });
    });

    it('既にエレキフィールドの場合は更新しない', async () => {
      // Arrange
      const mockBattleRepository = { update: jest.fn().mockResolvedValue(undefined) };
      const ctx: BattleContext = {
        battle: createBattle(Field.ElectricTerrain),
        battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
      };

      // Act
      await effect.onEntry(pokemon, ctx);

      // Assert
      expect(mockBattleRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('modifyDamageDealt', () => {
    it('エレキフィールドのとき特殊技のダメージを 5461/4096 倍にする', () => {
      // Arrange
      const ctx = createDamageCtx(Field.ElectricTerrain, 'Special');

      // Act
      const result = effect.modifyDamageDealt(pokemon, 4096, ctx);

      // Assert
      expect(result).toBe(5461);
    });

    it('context.field が無い場合は battle.field を参照する', () => {
      // Arrange
      const ctx: BattleContext = {
        battle: createBattle(Field.ElectricTerrain),
        moveCategory: 'Special',
      };

      // Act
      const result = effect.modifyDamageDealt(pokemon, 100, ctx);

      // Assert
      expect(result).toBe(133);
    });

    it('エレキフィールドでも物理技は修正しない', () => {
      // Arrange
      const ctx = createDamageCtx(Field.ElectricTerrain, 'Physical');

      // Act
      const result = effect.modifyDamageDealt(pokemon, 100, ctx);

      // Assert
      expect(result).toBeUndefined();
    });

    it('エレキフィールド以外では修正しない', () => {
      // Arrange
      const ctx = createDamageCtx(Field.PsychicTerrain, 'Special');

      // Act
      const result = effect.modifyDamageDealt(pokemon, 100, ctx);

      // Assert
      expect(result).toBeUndefined();
    });

    it('battleContext が無い場合は修正しない', () => {
      // Act
      const result = effect.modifyDamageDealt(pokemon, 100, undefined);

      // Assert
      expect(result).toBeUndefined();
    });
  });
});
