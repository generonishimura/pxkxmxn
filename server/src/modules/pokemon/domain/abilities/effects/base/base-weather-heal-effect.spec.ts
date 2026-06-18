import { BaseWeatherHealEffect } from './base-weather-heal-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus, Weather } from '@/modules/battle/domain/entities/battle.entity';

class TestRainHeal extends BaseWeatherHealEffect {
  protected readonly weather = Weather.Rain;
}

class TestHailHeal extends BaseWeatherHealEffect {
  protected readonly weather = Weather.Hail;
}

describe('BaseWeatherHealEffect', () => {
  const createBattlePokemonStatus = (
    overrides?: Partial<BattlePokemonStatus>,
  ): BattlePokemonStatus =>
    new BattlePokemonStatus(
      overrides?.id ?? 1,
      overrides?.battleId ?? 1,
      overrides?.trainedPokemonId ?? 1,
      overrides?.trainerId ?? 1,
      overrides?.isActive ?? true,
      overrides?.currentHp ?? 50,
      overrides?.maxHp ?? 160, // 160 / 16 = 10
      overrides?.attackRank ?? 0,
      overrides?.defenseRank ?? 0,
      overrides?.specialAttackRank ?? 0,
      overrides?.specialDefenseRank ?? 0,
      overrides?.speedRank ?? 0,
      overrides?.accuracyRank ?? 0,
      overrides?.evasionRank ?? 0,
      overrides?.statusCondition ?? null,
    );

  const createBattleContext = (weather: Weather | null): BattleContext => {
    const battle = new Battle(1, 1, 2, 1, 2, 1, weather, null, BattleStatus.Active, null);
    const mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    };
    return {
      battle,
      battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
    };
  };

  it('対象天候のとき maxHp/16 を回復する', async () => {
    const effect = new TestRainHeal();
    const pokemon = createBattlePokemonStatus({ currentHp: 50, maxHp: 160 });
    const ctx = createBattleContext(Weather.Rain);

    await effect.onTurnEnd(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(pokemon.id, {
      currentHp: 60,
    });
  });

  it('対象外の天候では回復しない', async () => {
    const effect = new TestRainHeal();
    const pokemon = createBattlePokemonStatus({ currentHp: 50 });
    const ctx = createBattleContext(Weather.Sun);

    await effect.onTurnEnd(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('天候が null の場合は回復しない', async () => {
    const effect = new TestRainHeal();
    const pokemon = createBattlePokemonStatus({ currentHp: 50 });
    const ctx = createBattleContext(null);

    await effect.onTurnEnd(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('HP 満タンなら回復しない', async () => {
    const effect = new TestRainHeal();
    const pokemon = createBattlePokemonStatus({ currentHp: 160, maxHp: 160 });
    const ctx = createBattleContext(Weather.Rain);

    await effect.onTurnEnd(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('maxHp を超えないようクランプ', async () => {
    const effect = new TestRainHeal();
    const pokemon = createBattlePokemonStatus({ currentHp: 155, maxHp: 160 });
    const ctx = createBattleContext(Weather.Rain);

    await effect.onTurnEnd(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(pokemon.id, {
      currentHp: 160,
    });
  });

  it('Hail-heal 派生クラスはあられで動作', async () => {
    const effect = new TestHailHeal();
    const pokemon = createBattlePokemonStatus({ currentHp: 50, maxHp: 160 });
    const ctx = createBattleContext(Weather.Hail);

    await effect.onTurnEnd(pokemon, ctx);

    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(pokemon.id, {
      currentHp: 60,
    });
  });

  it('battleRepository が無い場合は何もしない', async () => {
    const effect = new TestRainHeal();
    const pokemon = createBattlePokemonStatus();
    const ctx: BattleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, Weather.Rain, null, BattleStatus.Active, null),
    };

    await expect(effect.onTurnEnd(pokemon, ctx)).resolves.toBeUndefined();
  });
});
