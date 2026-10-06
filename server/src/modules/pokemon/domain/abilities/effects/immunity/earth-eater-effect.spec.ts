import { EarthEaterEffect } from './earth-eater-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('EarthEaterEffect', () => {
  const createPokemon = (currentHp: number): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, currentHp, 100, 0, 0, 0, 0, 0, 0, 0, null);

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

  let effect: EarthEaterEffect;

  beforeEach(() => {
    effect = new EarthEaterEffect();
  });

  describe('isImmuneToType', () => {
    it('じめんタイプの技を無効化する', () => {
      // Arrange
      const pokemon = createPokemon(100);

      // Act
      const result = effect.isImmuneToType(pokemon, 'じめん');

      // Assert
      expect(result).toBe(true);
    });

    it('じめん以外のタイプの技は無効化しない', () => {
      // Arrange
      const pokemon = createPokemon(100);

      // Act
      const result = effect.isImmuneToType(pokemon, 'みず');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('onAfterTakingDamage', () => {
    it('じめん技を無効化したとき最大 HP の 1/4 を回復する', async () => {
      // Arrange
      const pokemon = createPokemon(50);
      const ctx = createCtx(pokemon, 'じめん');

      // Act
      await effect.onAfterTakingDamage(pokemon, 0, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        currentHp: 75,
      });
    });

    it('じめん以外の技では回復しない', async () => {
      // Arrange
      const pokemon = createPokemon(50);
      const ctx = createCtx(pokemon, 'ほのお');

      // Act
      await effect.onAfterTakingDamage(pokemon, 0, ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });
  });
});
