import { RototillerEffect } from './rototiller-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('RototillerEffect', () => {
  const createBattlePokemonStatus = (id: number): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createBattleContext = (primaryTypeName: string): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    battleRepository: {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    } as unknown as BattleContext['battleRepository'],
    trainedPokemonRepository: {
      findById: jest.fn().mockResolvedValue({
        id: 1,
        pokemon: { id: 1, primaryType: { name: primaryTypeName }, secondaryType: null },
        ability: null,
      }),
    } as unknown as BattleContext['trainedPokemonRepository'],
  });

  it('くさタイプのポケモンの攻撃と特攻を1段階ずつ上げる', async () => {
    // Arrange
    const effect = new RototillerEffect();
    const attacker = createBattlePokemonStatus(1);
    const defender = createBattlePokemonStatus(2);
    const ctx = createBattleContext('くさ');

    // Act
    await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      attackRank: 1,
      specialAttackRank: 1,
    });
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      attackRank: 1,
      specialAttackRank: 1,
    });
  });

  it('くさタイプがいないときは失敗し、null を返す', async () => {
    // Arrange
    const effect = new RototillerEffect();
    const ctx = createBattleContext('ノーマル');

    // Act
    const result = await effect.onUse(
      createBattlePokemonStatus(1),
      createBattlePokemonStatus(2),
      ctx,
    );

    // Assert
    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });
});
