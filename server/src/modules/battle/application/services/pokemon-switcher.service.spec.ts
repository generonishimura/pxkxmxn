import { PokemonSwitcherService } from './pokemon-switcher.service';
import { IBattleRepository } from '../../domain/battle.repository.interface';
import { Battle, BattleStatus } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { VolatileState } from '../../domain/state/volatile-state';
import { PersistentPokemonState } from '../../domain/state/persistent-state';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';

describe('PokemonSwitcherService - 状態の片付け', () => {
  const LEAVING_ID = 1;
  const INCOMING_ID = 2;
  const OPPONENT_ID = 3;

  const createStatus = (
    id: number,
    trainerId: number,
    isActive: boolean,
    volatileState: VolatileState = {},
    persistentState: PersistentPokemonState = {},
  ): BattlePokemonStatus =>
    new BattlePokemonStatus(
      id,
      1,
      id * 100,
      trainerId,
      isActive,
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
      volatileState,
      persistentState,
    );

  const setup = (options: { leaving?: VolatileState; opponent?: VolatileState } = {}) => {
    const leaving = createStatus(LEAVING_ID, 1, true, options.leaving, { disguiseBusted: true });
    const incoming = createStatus(INCOMING_ID, 1, false);
    const opponent = createStatus(OPPONENT_ID, 2, true, options.opponent);
    const battleRepository = {
      findById: jest.fn().mockResolvedValue(null),
      findBattlePokemonStatusById: jest.fn().mockResolvedValue(null),
      findActivePokemonByBattleIdAndTrainerId: jest.fn().mockResolvedValue(leaving),
      findBattlePokemonStatusByBattleId: jest.fn().mockResolvedValue([leaving, incoming, opponent]),
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(incoming),
    };
    const trainedPokemonRepository: jest.Mocked<ITrainedPokemonRepository> = {
      findById: jest.fn().mockResolvedValue(null),
      findByTrainerId: jest.fn(),
    };
    const service = new PokemonSwitcherService(
      battleRepository as unknown as IBattleRepository,
      trainedPokemonRepository,
      {
        getTypeEffectivenessMap: jest.fn().mockResolvedValue(new Map()),
        findTypeByName: jest.fn().mockResolvedValue(null),
      },
    );
    const battle = new Battle(1, 1, 2, 1, 2, 4, null, null, BattleStatus.Active, null);
    return { service, battleRepository, battle };
  };

  it('引っ込むポケモンの volatileState と能力ランクをすべて消す', async () => {
    // Arrange
    const { service, battleRepository, battle } = setup({
      leaving: { leechSeed: true, substituteHp: 25, form: 'zen' },
    });

    // Act
    await service.executeSwitch(battle, 1, INCOMING_ID * 100);

    // Assert
    expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(LEAVING_ID, {
      isActive: false,
      statusCondition: null,
      attackRank: 0,
      defenseRank: 0,
      specialAttackRank: 0,
      specialDefenseRank: 0,
      speedRank: 0,
      accuracyRank: 0,
      evasionRank: 0,
      volatileState: {},
    });
  });

  it('引っ込むポケモンの persistentState は書き換えない', async () => {
    // Arrange
    const { service, battleRepository, battle } = setup();

    // Act
    await service.executeSwitch(battle, 1, INCOMING_ID * 100);

    // Assert
    const [, data] = battleRepository.updateBattlePokemonStatus.mock.calls[0];
    expect(data).not.toHaveProperty('persistentState');
  });

  it('出てくるポケモンには、今のターンを switchedInTurn として書く', async () => {
    // Arrange
    const { service, battleRepository, battle } = setup();

    // Act
    await service.executeSwitch(battle, 1, INCOMING_ID * 100);

    // Assert
    expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(INCOMING_ID, {
      isActive: true,
      volatileState: { switchedInTurn: 4 },
    });
  });

  it('相手の、引っ込むポケモンによる逃げられない状態・たこがため・メロメロを消す', async () => {
    // Arrange
    const { service, battleRepository, battle } = setup({
      opponent: {
        trappedByStatusId: LEAVING_ID,
        octolock: true,
        infatuatedWithStatusId: LEAVING_ID,
        tauntTurns: 2,
      },
    });

    // Act
    await service.executeSwitch(battle, 1, INCOMING_ID * 100);

    // Assert
    expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(OPPONENT_ID, {
      volatileState: { tauntTurns: 2 },
    });
  });

  it('相手の状態が引っ込むポケモンを指していなければ、相手には書き込まない', async () => {
    // Arrange
    const { service, battleRepository, battle } = setup({ opponent: { tauntTurns: 2 } });

    // Act
    await service.executeSwitch(battle, 1, INCOMING_ID * 100);

    // Assert
    const writtenIds = battleRepository.updateBattlePokemonStatus.mock.calls.map(([id]) => id);
    expect(writtenIds).toEqual([LEAVING_ID, INCOMING_ID]);
  });
});
