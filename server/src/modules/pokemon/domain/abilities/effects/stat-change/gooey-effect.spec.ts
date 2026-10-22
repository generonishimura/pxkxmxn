import { GooeyEffect } from './gooey-effect';
import { AbilityRegistry } from '../../ability-registry';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

describe('GooeyEffect', () => {
  it('物理技を受けたとき、攻撃側の素早さを1段階下げる', async () => {
    // Arrange
    const effect = new GooeyEffect();
    const defender = new BattlePokemonStatus(1, 1, 1, 1, true, 50, 100, 0, 0, 0, 0, 0, 0, 0, null);
    const attacker = new BattlePokemonStatus(2, 1, 2, 2, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
    const battleRepository = {
      updateBattlePokemonStatus: jest.fn(),
    } as unknown as jest.Mocked<IBattleRepository>;

    // Act
    const result = await effect.applyContactStatusCondition(defender, attacker, {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
      battleRepository,
      moveCategory: 'Physical',
    });

    // Assert
    expect(result).toBe(true);
    expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, { speedRank: -1 });
  });

  it('AbilityRegistryに「ぬめぬめ」として登録されている', () => {
    // Arrange
    AbilityRegistry.clear();
    AbilityRegistry.initialize();

    // Act
    const effect = AbilityRegistry.get('ぬめぬめ');

    // Assert
    expect(effect).toBeInstanceOf(GooeyEffect);
  });
});
