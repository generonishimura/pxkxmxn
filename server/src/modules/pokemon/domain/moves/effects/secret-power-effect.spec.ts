import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus, Field } from '@/modules/battle/domain/entities/battle.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { BattleContext } from '../../abilities/battle-context.interface';
import { MoveRegistry } from '../move-registry';
import { SecretPowerEffect } from './secret-power-effect';

const createStatus = (id: number): BattlePokemonStatus =>
  new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

const createContext = (
  field: Field | null,
  defenderPrimaryType = 'ノーマル',
): { battleContext: BattleContext; updateMock: jest.Mock } => {
  const updateMock = jest.fn().mockResolvedValue(undefined);
  const battleRepository = {
    updateBattlePokemonStatus: updateMock,
  } as unknown as IBattleRepository;
  const trainedPokemonRepository = {
    findById: jest.fn().mockResolvedValue({
      id: 2,
      pokemon: { id: 1, primaryType: { name: defenderPrimaryType }, secondaryType: null },
      ability: null,
    }),
  } as unknown as ITrainedPokemonRepository;
  return {
    battleContext: {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, field, BattleStatus.Active, null),
      battleRepository,
      trainedPokemonRepository,
    },
    updateMock,
  };
};

describe('SecretPowerEffect', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Math.random >= 0.3 なら追加効果は発動しない', async () => {
    // Arrange
    const effect = new SecretPowerEffect();
    const { battleContext, updateMock } = createContext(Field.GrassyTerrain);
    jest.spyOn(Math, 'random').mockReturnValue(0.3);

    // Act
    const result = await effect.onHit(createStatus(1), createStatus(2), battleContext);

    // Assert
    expect(result).toBeNull();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('フィールドがないとき30%で相手をまひにする', async () => {
    // Arrange
    const effect = new SecretPowerEffect();
    const { battleContext, updateMock } = createContext(null);
    jest.spyOn(Math, 'random').mockReturnValue(0.29);

    // Act
    const result = await effect.onHit(createStatus(1), createStatus(2), battleContext);

    // Assert
    expect(updateMock).toHaveBeenCalledWith(2, { statusCondition: StatusCondition.Paralysis });
    expect(result).toBe('was paralyzed!');
  });

  it('Field.None のとき相手をまひにする', async () => {
    // Arrange
    const effect = new SecretPowerEffect();
    const { battleContext, updateMock } = createContext(Field.None);
    jest.spyOn(Math, 'random').mockReturnValue(0);

    // Act
    await effect.onHit(createStatus(1), createStatus(2), battleContext);

    // Assert
    expect(updateMock).toHaveBeenCalledWith(2, { statusCondition: StatusCondition.Paralysis });
  });

  it('エレキフィールドのとき相手をまひにする', async () => {
    // Arrange
    const effect = new SecretPowerEffect();
    const { battleContext, updateMock } = createContext(Field.ElectricTerrain);
    jest.spyOn(Math, 'random').mockReturnValue(0);

    // Act
    await effect.onHit(createStatus(1), createStatus(2), battleContext);

    // Assert
    expect(updateMock).toHaveBeenCalledWith(2, { statusCondition: StatusCondition.Paralysis });
  });

  it('でんきタイプの相手はまひにならない', async () => {
    // Arrange
    const effect = new SecretPowerEffect();
    const { battleContext, updateMock } = createContext(null, 'でんき');
    jest.spyOn(Math, 'random').mockReturnValue(0);

    // Act
    const result = await effect.onHit(createStatus(1), createStatus(2), battleContext);

    // Assert
    expect(result).toBeNull();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('グラスフィールドのとき相手をねむりにする', async () => {
    // Arrange
    const effect = new SecretPowerEffect();
    const { battleContext, updateMock } = createContext(Field.GrassyTerrain);
    jest.spyOn(Math, 'random').mockReturnValue(0);

    // Act
    const result = await effect.onHit(createStatus(1), createStatus(2), battleContext);

    // Assert
    expect(updateMock).toHaveBeenCalledWith(2, { statusCondition: StatusCondition.Sleep });
    expect(result).toBe('fell asleep!');
  });

  it('ミストフィールドのとき相手のとくこうを1段階下げる', async () => {
    // Arrange
    const effect = new SecretPowerEffect();
    const { battleContext, updateMock } = createContext(Field.MistyTerrain);
    jest.spyOn(Math, 'random').mockReturnValue(0);

    // Act
    const result = await effect.onHit(createStatus(1), createStatus(2), battleContext);

    // Assert
    expect(updateMock).toHaveBeenCalledWith(2, { specialAttackRank: -1 });
    expect(result).toBe('Special Attack fell!');
  });

  it('サイコフィールドのとき相手のすばやさを1段階下げる', async () => {
    // Arrange
    const effect = new SecretPowerEffect();
    const { battleContext, updateMock } = createContext(Field.PsychicTerrain);
    jest.spyOn(Math, 'random').mockReturnValue(0);

    // Act
    const result = await effect.onHit(createStatus(1), createStatus(2), battleContext);

    // Assert
    expect(updateMock).toHaveBeenCalledWith(2, { speedRank: -1 });
    expect(result).toBe('Speed fell!');
  });

  it('ひみつのちからとして登録されている', () => {
    // Arrange
    MoveRegistry.initialize();

    // Act
    const registered = MoveRegistry.get('ひみつのちから');

    // Assert
    expect(registered).toBeInstanceOf(SecretPowerEffect);
  });
});
