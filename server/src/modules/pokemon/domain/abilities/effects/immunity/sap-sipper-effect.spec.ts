import { SapSipperEffect } from './sap-sipper-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, Field, BattleStatus, Battle } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

describe('SapSipperEffect', () => {
  let effect: SapSipperEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;
  let mockBattleRepository: jest.Mocked<IBattleRepository>;

  beforeEach(() => {
    effect = new SapSipperEffect();
    pokemon = new BattlePokemonStatus(
      1,
      1,
      1,
      1,
      true,
      100,
      100,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      null,
    );

    mockBattleRepository = {
      update: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      findBattlePokemonStatusByBattleId: jest.fn(),
      createBattlePokemonStatus: jest.fn(),
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(pokemon),
      findActivePokemonByBattleIdAndTrainerId: jest.fn(),
      findBattlePokemonStatusById: jest.fn().mockResolvedValue(pokemon),
      findBattlePokemonMovesByBattlePokemonStatusId: jest.fn(),
      createBattlePokemonMove: jest.fn(),
      updateBattlePokemonMove: jest.fn(),
      findBattlePokemonMoveById: jest.fn(),
    } as jest.Mocked<IBattleRepository>;

    battleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, Weather.None, Field.None, BattleStatus.Active, null),
      battleRepository: mockBattleRepository,
    };
  });

  describe('isImmuneToType', () => {
    it('くさタイプの技に対して true を返す', () => {
      expect(effect.isImmuneToType(pokemon, 'くさ', battleContext)).toBe(true);
    });

    it('くさタイプ以外の技に対して false を返す', () => {
      expect(effect.isImmuneToType(pokemon, 'みず', battleContext)).toBe(false);
      expect(effect.isImmuneToType(pokemon, 'ほのお', battleContext)).toBe(false);
    });
  });

  describe('onAfterTakingDamage', () => {
    it('くさ技を受けて無効化したとき、攻撃を +1 にする', async () => {
      battleContext.moveTypeName = 'くさ';

      await effect.onAfterTakingDamage(pokemon, 0, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(pokemon.id, {
        attackRank: 1,
      });
    });

    it('くさ以外の技では発動しない', async () => {
      battleContext.moveTypeName = 'みず';

      await effect.onAfterTakingDamage(pokemon, 50, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('moveTypeName が無いときは発動しない', async () => {
      await effect.onAfterTakingDamage(pokemon, 0, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('既に攻撃ランクが +6 のときは更新しない', async () => {
      battleContext.moveTypeName = 'くさ';
      const maxRankPokemon = new BattlePokemonStatus(
        1, 1, 1, 1, true, 100, 100, 6, 0, 0, 0, 0, 0, 0, null,
      );
      mockBattleRepository.findBattlePokemonStatusById.mockResolvedValue(maxRankPokemon);

      await effect.onAfterTakingDamage(pokemon, 0, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('battleRepository が無い場合は何もしない', async () => {
      const ctx: BattleContext = {
        battle: battleContext.battle,
      };
      ctx.moveTypeName = 'くさ';

      await expect(effect.onAfterTakingDamage(pokemon, 0, ctx)).resolves.toBeUndefined();
    });
  });
});
