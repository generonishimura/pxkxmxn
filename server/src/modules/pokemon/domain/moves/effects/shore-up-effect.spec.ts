import { ShoreUpEffect } from './shore-up-effect';
import { BattleContext } from '../../abilities/battle-context.interface';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import { Battle, Weather } from '@/modules/battle/domain/entities/battle.entity';
import { createBattleContext, createBattlePokemonStatus } from './__tests__/test-helpers';

describe('ShoreUpEffect', () => {
  it.each([
    ['天候なし', null, 75],
    ['にほんばれ', Weather.Sun, 75],
    ['あめ', Weather.Rain, 75],
    ['すなあらし', Weather.Sandstorm, 100],
  ])('%s のときは最大 HP 150 から %i 回復する', async (_label, weather, expectedHp) => {
    // Arrange
    const effect = new ShoreUpEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 0, maxHp: 150 });
    const defender = createBattlePokemonStatus({ id: 2 });
    const battleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    } as unknown as IBattleRepository;
    const ctx: BattleContext = {
      ...createBattleContext({ battle: { weather } as Battle, battleRepository }),
      weather,
    };

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBe('user restored its HP!');
    expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      currentHp: expectedHp,
    });
  });

  it('HP が満タンなら失敗する', async () => {
    // Arrange
    const effect = new ShoreUpEffect();
    const attacker = createBattlePokemonStatus({ currentHp: 150, maxHp: 150 });
    const defender = createBattlePokemonStatus({ id: 2 });
    const battleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    } as unknown as IBattleRepository;
    const ctx = createBattleContext({ battleRepository });

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBeNull();
    expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });
});
