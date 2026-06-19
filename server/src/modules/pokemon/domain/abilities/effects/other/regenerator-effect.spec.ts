import { RegeneratorEffect } from './regenerator-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('RegeneratorEffect', () => {
  const createPokemon = (currentHp: number, maxHp: number = 150): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, currentHp, maxHp, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (): BattleContext => {
    const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
    const mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    };
    return {
      battle,
      battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
    };
  };

  let effect: RegeneratorEffect;

  beforeEach(() => {
    effect = new RegeneratorEffect();
  });

  it('最大HPの1/3を回復する', async () => {
    const pokemon = createPokemon(50, 150);
    const ctx = createCtx();

    await effect.onSwitchOut(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(pokemon.id, {
      currentHp: 100, // 50 + (150/3 = 50)
    });
  });

  it('HP 満タンなら回復しない', async () => {
    const pokemon = createPokemon(150, 150);
    const ctx = createCtx();

    await effect.onSwitchOut(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('回復で maxHp を超えない', async () => {
    const pokemon = createPokemon(140, 150);
    const ctx = createCtx();

    await effect.onSwitchOut(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(pokemon.id, {
      currentHp: 150,
    });
  });

  it('battleRepository が無い場合は何もしない', async () => {
    const pokemon = createPokemon(50, 150);
    const ctx: BattleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    };

    await expect(effect.onSwitchOut(pokemon, ctx)).resolves.toBeUndefined();
  });
});
