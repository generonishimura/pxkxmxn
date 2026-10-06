import { WeakArmorEffect } from './weak-armor-effect';
import { AbilityRegistry } from '../../ability-registry';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

describe('WeakArmorEffect', () => {
  const createContext = (
    battleRepository: IBattleRepository,
    moveCategory: BattleContext['moveCategory'],
  ): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    battleRepository,
    moveCategory,
  });

  it('物理技を受けたとき、自分の防御を1段階下げ、素早さを2段階上げる', async () => {
    // Arrange
    const effect = new WeakArmorEffect();
    const defender = new BattlePokemonStatus(1, 1, 1, 1, true, 50, 100, 0, 0, 0, 0, 0, 0, 0, null);
    const attacker = new BattlePokemonStatus(2, 1, 2, 2, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
    const battleRepository = {
      updateBattlePokemonStatus: jest.fn(),
    } as unknown as jest.Mocked<IBattleRepository>;

    // Act
    const result = await effect.applyContactStatusCondition(
      defender,
      attacker,
      createContext(battleRepository, 'Physical'),
    );

    // Assert
    expect(result).toBe(true);
    expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
      defenseRank: -1,
      speedRank: 2,
    });
  });

  it('特殊技を受けたときは発動しない', async () => {
    // Arrange
    const effect = new WeakArmorEffect();
    const defender = new BattlePokemonStatus(1, 1, 1, 1, true, 50, 100, 0, 0, 0, 0, 0, 0, 0, null);
    const attacker = new BattlePokemonStatus(2, 1, 2, 2, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
    const battleRepository = {
      updateBattlePokemonStatus: jest.fn(),
    } as unknown as jest.Mocked<IBattleRepository>;

    // Act
    const result = await effect.applyContactStatusCondition(
      defender,
      attacker,
      createContext(battleRepository, 'Special'),
    );

    // Assert
    expect(result).toBe(false);
    expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('AbilityRegistryに「くだけるよろい」として登録されている', () => {
    // Arrange
    AbilityRegistry.clear();
    AbilityRegistry.initialize();

    // Act
    const effect = AbilityRegistry.get('くだけるよろい');

    // Assert
    expect(effect).toBeInstanceOf(WeakArmorEffect);
  });
});
