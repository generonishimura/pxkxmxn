import { ShedSkinEffect } from './shed-skin-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus, Field, Weather } from '@/modules/battle/domain/entities/battle.entity';

describe('ShedSkinEffect', () => {
  const createPokemon = (status: StatusCondition | null): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, status);

  const createCtx = (): BattleContext => {
    const battle = new Battle(1, 1, 2, 1, 2, 1, Weather.None, Field.None, BattleStatus.Active, null);
    const mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    };
    return {
      battle,
      battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
    };
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('30% 内（0.0〜0.3）で当選すると治癒する', async () => {
    const effect = new ShedSkinEffect();
    const pokemon = createPokemon(StatusCondition.Paralysis);
    const ctx = createCtx();
    jest.spyOn(Math, 'random').mockReturnValue(0.1);

    await effect.onTurnEnd(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(pokemon.id, {
      statusCondition: StatusCondition.None,
    });
  });

  it('確率外では治癒しない', async () => {
    const effect = new ShedSkinEffect();
    const pokemon = createPokemon(StatusCondition.Paralysis);
    const ctx = createCtx();
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    await effect.onTurnEnd(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('状態異常が無いなら治癒しない', async () => {
    const effect = new ShedSkinEffect();
    const pokemon = createPokemon(null);
    const ctx = createCtx();
    jest.spyOn(Math, 'random').mockReturnValue(0.1);

    await effect.onTurnEnd(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });
});
