import { RoughSkinEffect } from './rough-skin-effect';
import { AbilityRegistry } from '../../ability-registry';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import { HitResult } from '../../../battle-events/hit-result';

describe('RoughSkinEffect', () => {
  it('接触技を受けたとき、攻撃側に最大HPの1/8のダメージを与える', async () => {
    // Arrange
    const effect = new RoughSkinEffect();
    const defender = new BattlePokemonStatus(1, 1, 1, 1, true, 50, 100, 0, 0, 0, 0, 0, 0, 0, null);
    const attacker = new BattlePokemonStatus(2, 1, 2, 2, true, 160, 160, 0, 0, 0, 0, 0, 0, 0, null);
    const battleRepository = {
      updateBattlePokemonStatus: jest.fn(),
    } as unknown as jest.Mocked<IBattleRepository>;

    const hit: HitResult = {
      damage: 10,
      hpBefore: 60,
      hitIndex: 0,
      hitCount: 1,
      isContact: true,
      moveTypeName: 'ノーマル',
      moveCategory: 'Physical',
      targetFainted: false,
    };

    // Act
    const result = await effect.onDamagingHit(defender, attacker, hit, {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
      battleRepository,
      moveCategory: 'Physical',
    });

    // Assert
    expect(result).toBe('さめはだ activated!');
    expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, { currentHp: 140 });
  });

  it('AbilityRegistryに「さめはだ」として登録されている', () => {
    // Arrange
    AbilityRegistry.clear();
    AbilityRegistry.initialize();

    // Act
    const effect = AbilityRegistry.get('さめはだ');

    // Assert
    expect(effect).toBeInstanceOf(RoughSkinEffect);
  });
});
