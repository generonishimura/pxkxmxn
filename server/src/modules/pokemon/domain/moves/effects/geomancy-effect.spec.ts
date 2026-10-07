import { GeomancyEffect } from './geomancy-effect';
import { MoveRegistry } from '../move-registry';
import { MoveBehaviors } from '../move-behaviors';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import { createBattleContext, createBattlePokemonStatus } from './__tests__/test-helpers';

describe('GeomancyEffect（ジオコントロール）', () => {
  it('ため技として 1 ターンためる（MoveBehaviors の charge）', () => {
    // Act
    const isCharge = MoveBehaviors.has('ジオコントロール', 'charge');

    // Assert
    expect(isCharge).toBe(true);
  });

  it('出したときに特攻・特防・素早さを 2 段階ずつ上げる', async () => {
    // Arrange
    const attacker = createBattlePokemonStatus({ id: 1 });
    const defender = createBattlePokemonStatus({ id: 2 });
    const battleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(attacker),
      findBattlePokemonStatusById: jest.fn().mockResolvedValue(attacker),
    } as Partial<jest.Mocked<IBattleRepository>> as jest.Mocked<IBattleRepository>;

    // Act
    await new GeomancyEffect().onUse(attacker, defender, createBattleContext({ battleRepository }));

    // Assert
    expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ specialAttackRank: 2, specialDefenseRank: 2, speedRank: 2 }),
    );
  });

  it('DB の技名で登録されている', () => {
    // Arrange
    MoveRegistry.initialize();

    // Act
    const effect = MoveRegistry.get('ジオコントロール');

    // Assert
    expect(effect).toBeInstanceOf(GeomancyEffect);
  });
});
