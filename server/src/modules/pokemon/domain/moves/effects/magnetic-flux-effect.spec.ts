import { MagneticFluxEffect } from './magnetic-flux-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('MagneticFluxEffect', () => {
  const createBattlePokemonStatus = (id: number): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createBattleContext = (abilityName: string): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    battleRepository: {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
      // かがくへんかガスの判定で、場のポケモンを引く
      findBattlePokemonStatusByBattleId: jest.fn().mockResolvedValue([]),
    } as unknown as BattleContext['battleRepository'],
    trainedPokemonRepository: {
      findById: jest.fn().mockResolvedValue({
        id: 1,
        pokemon: { id: 1, primaryType: { name: 'でんき' }, secondaryType: null },
        ability: { id: 1, name: abilityName },
      }),
    } as unknown as BattleContext['trainedPokemonRepository'],
  });

  it('特性がプラスのとき、自分の防御と特防を1段階ずつ上げる', async () => {
    // Arrange
    const effect = new MagneticFluxEffect();
    const attacker = createBattlePokemonStatus(1);
    const ctx = createBattleContext('プラス');

    // Act
    const result = await effect.onUse(attacker, createBattlePokemonStatus(2), ctx);

    // Assert
    expect(result).toBe('Defense rose! Special Defense rose!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      defenseRank: 1,
      specialDefenseRank: 1,
    });
  });

  it('特性がプラス・マイナス以外のときは失敗し、null を返す', async () => {
    // Arrange
    const effect = new MagneticFluxEffect();
    const ctx = createBattleContext('じりょく');

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
