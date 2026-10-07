import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus, Field } from '@/modules/battle/domain/entities/battle.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import { Nature } from '@/modules/battle/domain/logic/stat-calculator';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { Pokemon } from '../../entities/pokemon.entity';
import { Type } from '../../entities/type.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { BaseStatChangeEffect } from './base/base-stat-change-effect';
import { AncientPowerEffect } from './ancient-power-effect';
import { FireFangEffect } from './fire-fang-effect';
import { TriAttackEffect } from './tri-attack-effect';
import { SecretPowerEffect } from './secret-power-effect';

/**
 * 10%でやけどにするテスト用の技効果
 */
class TestBurnEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Burn;
  protected readonly chance = 0.1;
  protected readonly immuneTypes = ['ほのお'];
  protected readonly message = 'was burned!';
}

/**
 * 必ず相手の防御を下げるテスト用の技効果
 */
class TestDefenseDropEffect extends BaseStatChangeEffect {
  protected readonly statType = 'defense' as const;
  protected readonly rankChange = -1;
  protected readonly chance = 1.0;
}

describe('追加効果の判定（rollSecondaryEffect への接続）', () => {
  const createStatus = (id: number): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createContext = (overrides: Partial<BattleContext>): BattleContext => {
    const pokemon = new Pokemon(
      1,
      1,
      'テスト',
      'Test',
      new Type(1, 'ノーマル', 'Normal'),
      null,
      100,
      100,
      100,
      100,
      100,
      100,
    );
    const trainedPokemon = new TrainedPokemon(
      1,
      1,
      pokemon,
      null,
      50,
      Gender.Male,
      Nature.Hardy,
      null,
      31,
      31,
      31,
      31,
      31,
      31,
      0,
      0,
      0,
      0,
      0,
      0,
    );
    const battleRepository: jest.Mocked<IBattleRepository> = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findBattlePokemonStatusByBattleId: jest.fn(),
      createBattlePokemonStatus: jest.fn(),
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(createStatus(2)),
      findActivePokemonByBattleIdAndTrainerId: jest.fn(),
      findBattlePokemonStatusById: jest.fn(),
      findBattlePokemonMovesByBattlePokemonStatusId: jest.fn(),
      createBattlePokemonMove: jest.fn(),
      updateBattlePokemonMove: jest.fn(),
      findBattlePokemonMoveById: jest.fn(),
      patchVolatileState: jest.fn(),
      patchPersistentState: jest.fn(),
      patchSideConditions: jest.fn(),
      patchGlobalFieldState: jest.fn(),
    };
    const trainedPokemonRepository: jest.Mocked<ITrainedPokemonRepository> = {
      findById: jest.fn().mockResolvedValue(trainedPokemon),
      findByTrainerId: jest.fn(),
    };
    return {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, Field.None, BattleStatus.Active, null),
      battleRepository,
      trainedPokemonRepository,
      ...overrides,
    };
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('状態異常の追加効果は確率倍率を掛けて判定する', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.15);
    const context = createContext({ secondaryEffectChanceMultiplier: 2 });

    // Act
    const result = await new TestBurnEffect().onHit(createStatus(1), createStatus(2), context);

    // Assert
    expect(result).toBe('was burned!');
  });

  it('相手への追加効果が止められていると状態異常にならない', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const context = createContext({ secondaryEffectsSuppressed: true });

    // Act
    const result = await new TestBurnEffect().onHit(createStatus(1), createStatus(2), context);

    // Assert
    expect(result).toBeNull();
    expect(context.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('相手への追加効果が止められていると能力ランクが下がらない', async () => {
    // Arrange
    const context = createContext({ secondaryEffectsSuppressed: true });

    // Act
    const result = await new TestDefenseDropEffect().onHit(
      createStatus(1),
      createStatus(2),
      context,
    );

    // Assert
    expect(result).toBeNull();
  });

  it('複数の状態異常を持つ追加効果も止められる', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const context = createContext({ secondaryEffectsSuppressed: true });

    // Act
    const result = await new FireFangEffect().onHit(createStatus(1), createStatus(2), context);

    // Assert
    expect(result).toBeNull();
  });

  it('トライアタックの追加効果も止められる', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const context = createContext({ secondaryEffectsSuppressed: true });

    // Act
    const result = await new TriAttackEffect().onHit(createStatus(1), createStatus(2), context);

    // Assert
    expect(result).toBeNull();
  });

  it('ひみつのちからの追加効果も止められる', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const context = createContext({ secondaryEffectsSuppressed: true });

    // Act
    const result = await new SecretPowerEffect().onHit(createStatus(1), createStatus(2), context);

    // Assert
    expect(result).toBeNull();
  });

  it('自分の能力を上げる追加効果は、止められていても確率倍率を掛けて発動する', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.15);
    const context = createContext({
      secondaryEffectsSuppressed: true,
      secondaryEffectChanceMultiplier: 2,
    });

    // Act
    const result = await new AncientPowerEffect().onHit(createStatus(1), createStatus(2), context);

    // Assert
    expect(result).not.toBeNull();
  });
});
