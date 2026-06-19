import { BaseTypeImmunityWithStatBoostEffect } from './base-type-immunity-with-stat-boost-effect';
import { StatType } from './base-stat-boost-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, Field, BattleStatus, Battle } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

class TestLightningRodLike extends BaseTypeImmunityWithStatBoostEffect {
  protected readonly immuneTypes = ['でんき'] as const;
  protected readonly boostStat: StatType = 'specialAttack';
}

class TestSpeedBoostLike extends BaseTypeImmunityWithStatBoostEffect {
  protected readonly immuneTypes = ['みず'] as const;
  protected readonly boostStat: StatType = 'speed';
}

describe('BaseTypeImmunityWithStatBoostEffect', () => {
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;
  let mockBattleRepository: jest.Mocked<IBattleRepository>;

  beforeEach(() => {
    pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

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

  it('Lightning Rod 相当: でんき技を無効化して特攻 +1', async () => {
    const effect = new TestLightningRodLike();
    battleContext.moveTypeName = 'でんき';

    await effect.onAfterTakingDamage(pokemon, 0, battleContext);

    expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(pokemon.id, {
      specialAttackRank: 1,
    });
  });

  it('対象外タイプでは発動しない', async () => {
    const effect = new TestLightningRodLike();
    battleContext.moveTypeName = 'ほのお';

    await effect.onAfterTakingDamage(pokemon, 50, battleContext);

    expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('別の boostStat を持つ派生クラスはそのステを上げる', async () => {
    const effect = new TestSpeedBoostLike();
    battleContext.moveTypeName = 'みず';

    await effect.onAfterTakingDamage(pokemon, 0, battleContext);

    expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(pokemon.id, {
      speedRank: 1,
    });
  });

  it('能力ランクが既に +6 のときは更新しない', async () => {
    const effect = new TestLightningRodLike();
    battleContext.moveTypeName = 'でんき';
    const maxRankPokemon = new BattlePokemonStatus(
      1, 1, 1, 1, true, 100, 100, 0, 0, 6, 0, 0, 0, 0, null,
    );
    mockBattleRepository.findBattlePokemonStatusById.mockResolvedValue(maxRankPokemon);

    await effect.onAfterTakingDamage(pokemon, 0, battleContext);

    expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('battleRepository が無い場合は何もしない', async () => {
    const effect = new TestLightningRodLike();
    const ctx: BattleContext = { battle: battleContext.battle, moveTypeName: 'でんき' };

    await expect(effect.onAfterTakingDamage(pokemon, 0, ctx)).resolves.toBeUndefined();
  });
});
