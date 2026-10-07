import { DrySkinEffect } from './dry-skin-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus, Weather } from '@/modules/battle/domain/entities/battle.entity';

describe('DrySkinEffect', () => {
  const createPokemon = (currentHp: number): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, currentHp, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (
    pokemon: BattlePokemonStatus,
    options: { weather?: Weather | null; moveTypeName?: string } = {},
  ): BattleContext => {
    const mockBattleRepository = {
      findBattlePokemonStatusById: jest.fn().mockResolvedValue(pokemon),
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    };
    return {
      battle: new Battle(
        1,
        1,
        2,
        1,
        2,
        1,
        options.weather ?? null,
        null,
        BattleStatus.Active,
        null,
      ),
      battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
      moveTypeName: options.moveTypeName,
    };
  };

  let effect: DrySkinEffect;

  beforeEach(() => {
    effect = new DrySkinEffect();
  });

  describe('isImmuneToType', () => {
    it('みずタイプの技を無効化する', () => {
      // Arrange
      const pokemon = createPokemon(100);

      // Act
      const result = effect.isImmuneToType(pokemon, 'みず');

      // Assert
      expect(result).toBe(true);
    });

    it('みず以外のタイプの技は無効化しない', () => {
      // Arrange
      const pokemon = createPokemon(100);

      // Act
      const result = effect.isImmuneToType(pokemon, 'ほのお');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('onAfterTakingDamage', () => {
    it('みず技を無効化したとき最大 HP の 1/4 を回復する', async () => {
      // Arrange
      const pokemon = createPokemon(50);
      const ctx = createCtx(pokemon, { moveTypeName: 'みず' });

      // Act
      await effect.onAfterTakingDamage(pokemon, 0, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        currentHp: 75,
      });
    });
  });

  describe('modifyDamage', () => {
    it('ほのお技のダメージを 1.25 倍にする', () => {
      // Arrange
      const pokemon = createPokemon(100);
      const ctx = createCtx(pokemon, { moveTypeName: 'ほのお' });

      // Act
      const result = effect.modifyDamage(pokemon, 100, ctx);

      // Assert
      expect(result).toBe(125);
    });

    it('小数になる値は切り捨てる', () => {
      // Arrange
      const pokemon = createPokemon(100);
      const ctx = createCtx(pokemon, { moveTypeName: 'ほのお' });

      // Act
      const result = effect.modifyDamage(pokemon, 101, ctx);

      // Assert
      expect(result).toBe(126);
    });

    it('ほのお以外の技のダメージは変えない', () => {
      // Arrange
      const pokemon = createPokemon(100);
      const ctx = createCtx(pokemon, { moveTypeName: 'くさ' });

      // Act
      const result = effect.modifyDamage(pokemon, 100, ctx);

      // Assert
      expect(result).toBe(100);
    });

    it('battleContext が無い場合はダメージを変えない', () => {
      // Arrange
      const pokemon = createPokemon(100);

      // Act
      const result = effect.modifyDamage(pokemon, 100, undefined);

      // Assert
      expect(result).toBe(100);
    });
  });

  describe('onTurnEnd', () => {
    it('雨のとき最大 HP の 1/8 を回復する', async () => {
      // Arrange
      const pokemon = createPokemon(50);
      const ctx = createCtx(pokemon, { weather: Weather.Rain });

      // Act
      await effect.onTurnEnd(pokemon, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        currentHp: 62,
      });
    });

    it('かいふくふうじ中は、雨でも回復しない', async () => {
      // Arrange
      const pokemon = new BattlePokemonStatus(
        1,
        1,
        1,
        1,
        true,
        50,
        100,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        null,
        {
          healBlockTurns: 2,
        },
      );
      const ctx = createCtx(pokemon, { weather: Weather.Rain });

      // Act
      await effect.onTurnEnd(pokemon, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('雨でも HP が満タンなら更新しない', async () => {
      // Arrange
      const pokemon = createPokemon(100);
      const ctx = createCtx(pokemon, { weather: Weather.Rain });

      // Act
      await effect.onTurnEnd(pokemon, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('雨の回復は最大 HP を超えない', async () => {
      // Arrange
      const pokemon = createPokemon(95);
      const ctx = createCtx(pokemon, { weather: Weather.Rain });

      // Act
      await effect.onTurnEnd(pokemon, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        currentHp: 100,
      });
    });

    it('晴れのとき最大 HP の 1/8 のダメージを受ける', async () => {
      // Arrange
      const pokemon = createPokemon(50);
      const ctx = createCtx(pokemon, { weather: Weather.Sun });

      // Act
      await effect.onTurnEnd(pokemon, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        currentHp: 38,
      });
    });

    it('晴れのダメージで HP は 0 を下回らない', async () => {
      // Arrange
      const pokemon = createPokemon(5);
      const ctx = createCtx(pokemon, { weather: Weather.Sun });

      // Act
      await effect.onTurnEnd(pokemon, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        currentHp: 0,
      });
    });

    it('晴れでも既に HP 0 なら更新しない', async () => {
      // Arrange
      const pokemon = createPokemon(0);
      const ctx = createCtx(pokemon, { weather: Weather.Sun });

      // Act
      await effect.onTurnEnd(pokemon, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('雨でも既に HP 0 なら回復しない', async () => {
      // Arrange
      const pokemon = createPokemon(0);
      const ctx = createCtx(pokemon, { weather: Weather.Rain });

      // Act
      await effect.onTurnEnd(pokemon, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('雨でも直前の状態異常ダメージで HP 0 になっていたら回復しない', async () => {
      // Arrange
      const pokemon = createPokemon(10);
      const ctx = createCtx(createPokemon(0), { weather: Weather.Rain });

      // Act
      await effect.onTurnEnd(pokemon, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('ターン終了時点の最新 HP を基準に計算する', async () => {
      // Arrange: 引数の HP は 50 だが、直前の状態異常ダメージで最新 HP は 40
      const pokemon = createPokemon(50);
      const ctx = createCtx(createPokemon(40), { weather: Weather.Sun });

      // Act
      await effect.onTurnEnd(pokemon, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        currentHp: 28,
      });
    });

    it('雨・晴れ以外の天候では何もしない', async () => {
      // Arrange
      const pokemon = createPokemon(50);
      const ctx = createCtx(pokemon, { weather: Weather.Sandstorm });

      // Act
      await effect.onTurnEnd(pokemon, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('battleRepository が無い場合は何もしない', async () => {
      // Arrange
      const pokemon = createPokemon(50);
      const ctx: BattleContext = {
        battle: new Battle(1, 1, 2, 1, 2, 1, Weather.Rain, null, BattleStatus.Active, null),
      };

      // Act & Assert
      await expect(effect.onTurnEnd(pokemon, ctx)).resolves.toBeUndefined();
    });
  });
});
