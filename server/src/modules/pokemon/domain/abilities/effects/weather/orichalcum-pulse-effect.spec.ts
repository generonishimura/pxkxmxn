import { OrichalcumPulseEffect } from './orichalcum-pulse-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import {
  Battle,
  BattleStatus,
  Field,
  Weather,
} from '@/modules/battle/domain/entities/battle.entity';

describe('OrichalcumPulseEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createBattle = (weather: Weather): Battle =>
    new Battle(1, 1, 2, 1, 2, 1, weather, Field.None, BattleStatus.Active, null);

  const createDamageCtx = (
    weather: Weather | null,
    moveCategory?: 'Physical' | 'Special' | 'Status',
  ): BattleContext => ({
    battle: createBattle(Weather.None),
    weather,
    moveCategory,
  });

  let effect: OrichalcumPulseEffect;

  beforeEach(() => {
    effect = new OrichalcumPulseEffect();
  });

  describe('onEntry', () => {
    it('場に出たとき天候を晴れにする', async () => {
      // Arrange
      const mockBattleRepository = {
        update: jest.fn().mockResolvedValue(undefined),
        findById: jest.fn().mockResolvedValue(null),
        // 天候・フィールドが変わったことを場のポケモンに知らせるときに引く
        findBattlePokemonStatusByBattleId: jest.fn().mockResolvedValue([]),
        patchGlobalFieldState: jest.fn(),
      };
      const ctx: BattleContext = {
        battle: createBattle(Weather.None),
        battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
      };

      // Act
      await effect.onEntry(pokemon, ctx);

      // Assert
      expect(mockBattleRepository.update).toHaveBeenCalledWith(1, { weather: Weather.Sun });
    });

    it('既に晴れの場合は更新しない', async () => {
      // Arrange
      const mockBattleRepository = {
        update: jest.fn().mockResolvedValue(undefined),
        findById: jest.fn().mockResolvedValue(null),
        // 天候・フィールドが変わったことを場のポケモンに知らせるときに引く
        findBattlePokemonStatusByBattleId: jest.fn().mockResolvedValue([]),
        patchGlobalFieldState: jest.fn(),
      };
      const ctx: BattleContext = {
        battle: createBattle(Weather.Sun),
        battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
      };

      // Act
      await effect.onEntry(pokemon, ctx);

      // Assert
      expect(mockBattleRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('modifyDamageDealt', () => {
    it('晴れのとき物理技のダメージを 5461/4096 倍にする', () => {
      // Arrange
      const ctx = createDamageCtx(Weather.Sun, 'Physical');

      // Act
      const result = effect.modifyDamageDealt(pokemon, 4096, ctx);

      // Assert
      expect(result).toBe(5461);
    });

    it('小数になる値は切り捨てる', () => {
      // Arrange
      const ctx = createDamageCtx(Weather.Sun, 'Physical');

      // Act
      const result = effect.modifyDamageDealt(pokemon, 100, ctx);

      // Assert
      expect(result).toBe(133);
    });

    it('context.weather が無い場合は battle.weather を参照する', () => {
      // Arrange
      const ctx: BattleContext = { battle: createBattle(Weather.Sun), moveCategory: 'Physical' };

      // Act
      const result = effect.modifyDamageDealt(pokemon, 100, ctx);

      // Assert
      expect(result).toBe(133);
    });

    it('晴れでも特殊技は修正しない', () => {
      // Arrange
      const ctx = createDamageCtx(Weather.Sun, 'Special');

      // Act
      const result = effect.modifyDamageDealt(pokemon, 100, ctx);

      // Assert
      expect(result).toBeUndefined();
    });

    it('晴れ以外の天候では修正しない', () => {
      // Arrange
      const ctx = createDamageCtx(Weather.Rain, 'Physical');

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
