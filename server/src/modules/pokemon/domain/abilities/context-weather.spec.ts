import { getContextWeather } from './context-weather';
import { Battle, BattleStatus, Weather } from '@/modules/battle/domain/entities/battle.entity';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import { HydrationEffect } from './effects/immunity/hydration-effect';
import { RainDishEffect } from './effects/weather/rain-dish-effect';
import { DrySkinEffect } from './effects/immunity/dry-skin-effect';
import { SolarPowerEffect } from './effects/damage-modify/solar-power-effect';

describe('getContextWeather', () => {
  const rainBattle = new Battle(1, 1, 2, 1, 2, 1, Weather.Rain, null, BattleStatus.Active, null);
  const sunBattle = new Battle(1, 1, 2, 1, 2, 1, Weather.Sun, null, BattleStatus.Active, null);

  const createStatus = (currentHp: number, statusCondition: StatusCondition | null) =>
    new BattlePokemonStatus(1, 1, 1, 1, true, currentHp, 160, 0, 0, 0, 0, 0, 0, 0, statusCondition);

  const createRepository = (): jest.Mocked<IBattleRepository> => ({
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findBattlePokemonStatusByBattleId: jest.fn(),
    createBattlePokemonStatus: jest.fn(),
    updateBattlePokemonStatus: jest.fn(),
    findActivePokemonByBattleIdAndTrainerId: jest.fn(),
    findBattlePokemonStatusById: jest.fn().mockResolvedValue(createStatus(80, null)),
    findBattlePokemonMovesByBattlePokemonStatusId: jest.fn(),
    createBattlePokemonMove: jest.fn(),
    updateBattlePokemonMove: jest.fn(),
    findBattlePokemonMoveById: jest.fn(),
    patchVolatileState: jest.fn(),
    patchPersistentState: jest.fn(),
    patchSideConditions: jest.fn(),
    patchGlobalFieldState: jest.fn(),
  });

  it('コンテキストの天候があればそれを返す', () => {
    // Arrange & Act
    const weather = getContextWeather({ battle: rainBattle, weather: Weather.None });

    // Assert
    expect(weather).toBe(Weather.None);
  });

  it('コンテキストの天候がなければバトルの天候を返す', () => {
    // Arrange & Act
    const weather = getContextWeather({ battle: rainBattle });

    // Assert
    expect(weather).toBe(Weather.Rain);
  });

  it('コンテキストがなければnullを返す', () => {
    // Arrange & Act
    const weather = getContextWeather(undefined);

    // Assert
    expect(weather).toBeNull();
  });

  describe('天候が消されているとき（weather: None）のターン終了時の特性', () => {
    it('うるおいボディは状態異常を治さない', async () => {
      // Arrange
      const battleRepository = createRepository();

      // Act
      await new HydrationEffect().onTurnEnd(createStatus(80, StatusCondition.Burn), {
        battle: rainBattle,
        battleRepository,
        weather: Weather.None,
      });

      // Assert
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('あめうけざらはHPを回復しない', async () => {
      // Arrange
      const battleRepository = createRepository();

      // Act
      await new RainDishEffect().onTurnEnd(createStatus(80, null), {
        battle: rainBattle,
        battleRepository,
        weather: Weather.None,
      });

      // Assert
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('かんそうはだはHPが変わらない', async () => {
      // Arrange
      const battleRepository = createRepository();

      // Act
      await new DrySkinEffect().onTurnEnd(createStatus(80, null), {
        battle: rainBattle,
        battleRepository,
        weather: Weather.None,
      });

      // Assert
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('サンパワーはHPが減らない', async () => {
      // Arrange
      const battleRepository = createRepository();

      // Act
      await new SolarPowerEffect().onTurnEnd(createStatus(80, null), {
        battle: sunBattle,
        battleRepository,
        weather: Weather.None,
      });

      // Assert
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });
  });
});
