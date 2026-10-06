import { WellBakedBodyEffect } from './well-baked-body-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('WellBakedBodyEffect', () => {
  const createPokemon = (defenseRank: number): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, defenseRank, 0, 0, 0, 0, 0, null);

  const createCtx = (pokemon: BattlePokemonStatus, moveTypeName?: string): BattleContext => {
    const mockBattleRepository = {
      findBattlePokemonStatusById: jest.fn().mockResolvedValue(pokemon),
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    };
    return {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
      battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
      moveTypeName,
    };
  };

  let effect: WellBakedBodyEffect;

  beforeEach(() => {
    effect = new WellBakedBodyEffect();
  });

  describe('isImmuneToType', () => {
    it('ほのおタイプの技を無効化する', () => {
      // Arrange
      const pokemon = createPokemon(0);

      // Act
      const result = effect.isImmuneToType(pokemon, 'ほのお');

      // Assert
      expect(result).toBe(true);
    });

    it('ほのお以外のタイプの技は無効化しない', () => {
      // Arrange
      const pokemon = createPokemon(0);

      // Act
      const result = effect.isImmuneToType(pokemon, 'みず');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('onAfterTakingDamage', () => {
    it('ほのお技を無効化したとき防御ランクを 2 段階上げる', async () => {
      // Arrange
      const pokemon = createPokemon(0);
      const ctx = createCtx(pokemon, 'ほのお');

      // Act
      await effect.onAfterTakingDamage(pokemon, 0, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        defenseRank: 2,
      });
    });

    it('防御ランクは +6 を超えない', async () => {
      // Arrange
      const pokemon = createPokemon(5);
      const ctx = createCtx(pokemon, 'ほのお');

      // Act
      await effect.onAfterTakingDamage(pokemon, 0, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        defenseRank: 6,
      });
    });

    it('ほのお以外の技では防御ランクを上げない', async () => {
      // Arrange
      const pokemon = createPokemon(0);
      const ctx = createCtx(pokemon, 'でんき');

      // Act
      await effect.onAfterTakingDamage(pokemon, 0, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });
  });
});
