import { SpeedBoostEffect } from './speed-boost-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('SpeedBoostEffect', () => {
  const createPokemon = (speedRank: number = 0): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, speedRank, 0, 0, null);

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

  let effect: SpeedBoostEffect;

  beforeEach(() => {
    effect = new SpeedBoostEffect();
  });

  it('ターン終了時に素早さランクを +1 する', async () => {
    const pokemon = createPokemon(0);
    const ctx = createCtx();

    await effect.onTurnEnd(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(pokemon.id, {
      speedRank: 1,
    });
  });

  it('既存ランクから +1（クランプ +6）', async () => {
    const pokemon = createPokemon(5);
    const ctx = createCtx();

    await effect.onTurnEnd(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(pokemon.id, {
      speedRank: 6,
    });
  });

  it('既に +6 なら更新しない', async () => {
    const pokemon = createPokemon(6);
    const ctx = createCtx();

    await effect.onTurnEnd(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('battleRepository が無い場合は何もしない', async () => {
    const pokemon = createPokemon(0);
    const ctx: BattleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    };

    await expect(effect.onTurnEnd(pokemon, ctx)).resolves.toBeUndefined();
  });
});
