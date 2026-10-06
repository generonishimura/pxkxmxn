import { BaseWeatherSelfHealEffect } from './base-weather-self-heal-effect';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import { Battle, Weather } from '@/modules/battle/domain/entities/battle.entity';
import { createBattleContext, createBattlePokemonStatus } from '../__tests__/test-helpers';

/**
 * テスト用の具象クラス
 */
class TestWeatherHealEffect extends BaseWeatherSelfHealEffect {}

describe('BaseWeatherSelfHealEffect', () => {
  const createRepository = (): IBattleRepository =>
    ({
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    }) as unknown as IBattleRepository;

  it.each([
    ['天候なし（null）', null, 75],
    ['天候なし（None）', Weather.None, 75],
    ['にほんばれ', Weather.Sun, 100],
    ['あめ', Weather.Rain, 37],
    ['すなあらし', Weather.Sandstorm, 37],
    ['あられ', Weather.Hail, 37],
  ])('%s のときは最大 HP 150 から %i 回復する', async (_label, weather, expectedHp) => {
    // Arrange
    const effect = new TestWeatherHealEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 0, maxHp: 150 });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx: BattleContext = {
      ...createBattleContext({
        battle: { weather } as Battle,
        battleRepository: createRepository(),
      }),
      weather,
    };

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBe('user restored its HP!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      currentHp: expectedHp,
    });
  });

  it('battleContext.weather がないときは battle.weather を使う', async () => {
    // Arrange
    const effect = new TestWeatherHealEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 0, maxHp: 150 });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext({
      battle: { weather: Weather.Sun } as Battle,
      battleRepository: createRepository(),
    });

    // Act
    await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      currentHp: 100,
    });
  });
});
