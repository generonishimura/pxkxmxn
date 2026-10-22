import { GearUpEffect } from './gear-up-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('GearUpEffect', () => {
  const createBattlePokemonStatus = (id: number): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createBattleContext = (abilityName: string): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    battleRepository: {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    } as unknown as BattleContext['battleRepository'],
    trainedPokemonRepository: {
      findById: jest.fn().mockResolvedValue({
        id: 1,
        pokemon: { id: 1, primaryType: { name: 'はがね' }, secondaryType: null },
        ability: { id: 1, name: abilityName },
      }),
    } as unknown as BattleContext['trainedPokemonRepository'],
  });

  it('特性がマイナスのとき、自分の攻撃と特攻を1段階ずつ上げる', async () => {
    // Arrange
    const effect = new GearUpEffect();
    const attacker = createBattlePokemonStatus(1);
    const ctx = createBattleContext('マイナス');

    // Act
    const result = await effect.onUse(attacker, createBattlePokemonStatus(2), ctx);

    // Assert
    expect(result).toBe('Attack rose! Special Attack rose!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      attackRank: 1,
      specialAttackRank: 1,
    });
  });

  it('特性がプラス・マイナス以外のときは失敗し、null を返す', async () => {
    // Arrange
    const effect = new GearUpEffect();
    const ctx = createBattleContext('クリアボディ');

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
