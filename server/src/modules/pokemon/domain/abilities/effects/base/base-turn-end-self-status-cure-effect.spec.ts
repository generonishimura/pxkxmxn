import { BaseTurnEndSelfStatusCureEffect } from './base-turn-end-self-status-cure-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus, Field, Weather } from '@/modules/battle/domain/entities/battle.entity';

class TestAlwaysCure extends BaseTurnEndSelfStatusCureEffect {
  protected shouldCure(): boolean {
    return true;
  }
}

class TestNeverCure extends BaseTurnEndSelfStatusCureEffect {
  protected shouldCure(): boolean {
    return false;
  }
}

describe('BaseTurnEndSelfStatusCureEffect', () => {
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

  it('shouldCure が true で状態異常があるなら治癒する', async () => {
    const effect = new TestAlwaysCure();
    const pokemon = createPokemon(StatusCondition.Burn);
    const ctx = createCtx();

    await effect.onTurnEnd(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(pokemon.id, {
      statusCondition: StatusCondition.None,
    });
  });

  it('shouldCure が false なら治癒しない', async () => {
    const effect = new TestNeverCure();
    const pokemon = createPokemon(StatusCondition.Burn);
    const ctx = createCtx();

    await effect.onTurnEnd(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('状態異常が無いなら治癒しない', async () => {
    const effect = new TestAlwaysCure();
    const pokemon = createPokemon(null);
    const ctx = createCtx();

    await effect.onTurnEnd(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('statusCondition が None でも治癒しない', async () => {
    const effect = new TestAlwaysCure();
    const pokemon = createPokemon(StatusCondition.None);
    const ctx = createCtx();

    await effect.onTurnEnd(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('battleRepository が無い場合は何もしない', async () => {
    const effect = new TestAlwaysCure();
    const pokemon = createPokemon(StatusCondition.Burn);
    const ctx: BattleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    };

    await expect(effect.onTurnEnd(pokemon, ctx)).resolves.toBeUndefined();
  });
});
