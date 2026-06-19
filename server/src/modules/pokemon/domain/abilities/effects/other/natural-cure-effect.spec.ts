import { NaturalCureEffect } from './natural-cure-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('NaturalCureEffect', () => {
  const createPokemon = (status: StatusCondition | null): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, status);

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

  let effect: NaturalCureEffect;

  beforeEach(() => {
    effect = new NaturalCureEffect();
  });

  it('状態異常があるなら治癒する', async () => {
    const pokemon = createPokemon(StatusCondition.Burn);
    const ctx = createCtx();

    await effect.onSwitchOut(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(pokemon.id, {
      statusCondition: StatusCondition.None,
    });
  });

  it('状態異常 None なら何もしない', async () => {
    const pokemon = createPokemon(StatusCondition.None);
    const ctx = createCtx();

    await effect.onSwitchOut(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('状態異常 null なら何もしない', async () => {
    const pokemon = createPokemon(null);
    const ctx = createCtx();

    await effect.onSwitchOut(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('battleRepository が無い場合は何もしない', async () => {
    const pokemon = createPokemon(StatusCondition.Burn);
    const ctx: BattleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    };

    await expect(effect.onSwitchOut(pokemon, ctx)).resolves.toBeUndefined();
  });
});
