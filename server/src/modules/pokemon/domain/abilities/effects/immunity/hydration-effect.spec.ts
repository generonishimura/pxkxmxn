import { HydrationEffect } from './hydration-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus, Field, Weather } from '@/modules/battle/domain/entities/battle.entity';

describe('HydrationEffect', () => {
  const createPokemon = (status: StatusCondition | null): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, status);

  const createCtx = (weather: Weather | null): BattleContext => {
    const battle = new Battle(1, 1, 2, 1, 2, 1, weather, Field.None, BattleStatus.Active, null);
    const mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    };
    return {
      battle,
      battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
    };
  };

  it('雨で状態異常があるなら治癒する', async () => {
    const effect = new HydrationEffect();
    const pokemon = createPokemon(StatusCondition.Burn);
    const ctx = createCtx(Weather.Rain);

    await effect.onTurnEnd(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(pokemon.id, {
      statusCondition: StatusCondition.None,
    });
  });

  it('雨以外では治癒しない', async () => {
    const effect = new HydrationEffect();
    const pokemon = createPokemon(StatusCondition.Burn);
    const ctx = createCtx(Weather.Sun);

    await effect.onTurnEnd(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('天候 null では治癒しない', async () => {
    const effect = new HydrationEffect();
    const pokemon = createPokemon(StatusCondition.Burn);
    const ctx = createCtx(null);

    await effect.onTurnEnd(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });
});
