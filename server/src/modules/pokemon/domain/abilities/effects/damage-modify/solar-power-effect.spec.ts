import { SolarPowerEffect } from './solar-power-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus, Weather } from '@/modules/battle/domain/entities/battle.entity';

describe('SolarPowerEffect', () => {
  const createPokemon = (currentHp: number, maxHp: number): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, currentHp, maxHp, 0, 0, 0, 0, 0, 0, 0, null);

  const createBattle = (weather: Weather | null): Battle =>
    new Battle(1, 1, 2, 1, 2, 1, weather, null, BattleStatus.Active, null);

  const createDamageCtx = (
    battleWeather: Weather | null,
    cat?: 'Physical' | 'Special' | 'Status',
    contextWeather?: Weather | null,
  ): BattleContext => ({
    battle: createBattle(battleWeather),
    weather: contextWeather,
    moveCategory: cat,
  });

  const createTurnEndCtx = (weather: Weather | null): BattleContext => ({
    battle: createBattle(weather),
    battleRepository: {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    } as unknown as BattleContext['battleRepository'],
  });

  let effect: SolarPowerEffect;

  beforeEach(() => {
    effect = new SolarPowerEffect();
  });

  describe('modifyDamageDealt', () => {
    it('はれのとき特殊技のダメージを 1.5 倍にする', () => {
      expect(
        effect.modifyDamageDealt(
          createPokemon(100, 100),
          100,
          createDamageCtx(Weather.Sun, 'Special'),
        ),
      ).toBe(150);
    });

    it('battleContext.weather がはれなら battle.weather より優先して強化する', () => {
      expect(
        effect.modifyDamageDealt(
          createPokemon(100, 100),
          100,
          createDamageCtx(null, 'Special', Weather.Sun),
        ),
      ).toBe(150);
    });

    it('はれでも物理技のダメージは変更しない', () => {
      expect(
        effect.modifyDamageDealt(
          createPokemon(100, 100),
          100,
          createDamageCtx(Weather.Sun, 'Physical'),
        ),
      ).toBeUndefined();
    });

    it('はれ以外の天候では特殊技のダメージを変更しない', () => {
      expect(
        effect.modifyDamageDealt(
          createPokemon(100, 100),
          100,
          createDamageCtx(Weather.Rain, 'Special'),
        ),
      ).toBeUndefined();
    });

    it('battleContext が無い場合は変更しない', () => {
      expect(effect.modifyDamageDealt(createPokemon(100, 100), 100, undefined)).toBeUndefined();
    });
  });

  describe('onTurnEnd', () => {
    it('はれのとき最大 HP の 1/8 を失う', async () => {
      // Arrange
      const pokemon = createPokemon(100, 160);
      const ctx = createTurnEndCtx(Weather.Sun);

      // Act
      await effect.onTurnEnd(pokemon, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(pokemon.id, {
        currentHp: 80,
      });
    });

    it('はれ以外の天候では HP を失わない', async () => {
      // Arrange
      const pokemon = createPokemon(100, 160);
      const ctx = createTurnEndCtx(Weather.Rain);

      // Act
      await effect.onTurnEnd(pokemon, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('最大 HP が小さくても最低 1 は失う', async () => {
      // Arrange
      const pokemon = createPokemon(5, 7);
      const ctx = createTurnEndCtx(Weather.Sun);

      // Act
      await effect.onTurnEnd(pokemon, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(pokemon.id, {
        currentHp: 4,
      });
    });

    it('HP は 0 未満にならない', async () => {
      // Arrange
      const pokemon = createPokemon(10, 160);
      const ctx = createTurnEndCtx(Weather.Sun);

      // Act
      await effect.onTurnEnd(pokemon, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(pokemon.id, {
        currentHp: 0,
      });
    });

    it('すでに HP が 0 なら何もしない', async () => {
      // Arrange
      const pokemon = createPokemon(0, 160);
      const ctx = createTurnEndCtx(Weather.Sun);

      // Act
      await effect.onTurnEnd(pokemon, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('battleRepository が無い場合は何もしない', async () => {
      // Arrange
      const pokemon = createPokemon(100, 160);
      const ctx: BattleContext = { battle: createBattle(Weather.Sun) };

      // Act & Assert
      await expect(effect.onTurnEnd(pokemon, ctx)).resolves.toBeUndefined();
    });
  });
});
