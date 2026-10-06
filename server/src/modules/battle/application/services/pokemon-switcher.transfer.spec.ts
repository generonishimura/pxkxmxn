import { PokemonSwitcherService } from './pokemon-switcher.service';
import { IBattleRepository } from '../../domain/battle.repository.interface';
import { Battle, BattleStatus } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { VolatileState } from '../../domain/state/volatile-state';
import { Nature } from '../../domain/logic/stat-calculator';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';

describe('PokemonSwitcherService - バトンタッチ・しっぽきりの引き継ぎと交代の制限', () => {
  const LEAVING_ID = 1;
  const INCOMING_ID = 2;

  const createStatus = (
    id: number,
    isActive: boolean,
    volatileState: VolatileState = {},
    attackRank = 0,
  ): BattlePokemonStatus =>
    new BattlePokemonStatus(
      id,
      1,
      id * 100,
      1,
      isActive,
      100,
      100,
      attackRank,
      0,
      0,
      0,
      2,
      0,
      0,
      null,
      volatileState,
    );

  const trainedPokemon = (type: Type): TrainedPokemon =>
    new TrainedPokemon(
      100,
      1,
      new Pokemon(1, 1, 'テスト', 'Test', type, null, 100, 100, 100, 100, 100, 100),
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

  const setup = (leavingState: VolatileState, type = new Type(1, 'ノーマル', 'Normal')) => {
    const leaving = createStatus(LEAVING_ID, true, leavingState, 2);
    const incoming = createStatus(INCOMING_ID, false);
    // 逃げられなくした相手（ID 3）は場にいる
    const trapper = createStatus(3, true);
    const battleRepository = {
      findActivePokemonByBattleIdAndTrainerId: jest.fn().mockResolvedValue(leaving),
      findBattlePokemonStatusByBattleId: jest.fn().mockResolvedValue([leaving, incoming]),
      findBattlePokemonStatusById: jest.fn((id: number) =>
        Promise.resolve(id === trapper.id ? trapper : null),
      ),
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(incoming),
    };
    const trainedPokemonRepository: jest.Mocked<ITrainedPokemonRepository> = {
      findById: jest.fn().mockResolvedValue(trainedPokemon(type)),
      findByTrainerId: jest.fn(),
    };
    const service = new PokemonSwitcherService(
      battleRepository as unknown as IBattleRepository,
      trainedPokemonRepository,
    );
    const battle = new Battle(1, 1, 2, 1, 2, 4, null, null, BattleStatus.Active, null);
    const incomingWrite = () =>
      battleRepository.updateBattlePokemonStatus.mock.calls.find(([id]) => id === INCOMING_ID)?.[1];
    return { service, battle, leaving, incomingWrite };
  };

  it('バトンタッチでは、引き継ぐ一時的な状態と能力ランクを次のポケモンに書く', async () => {
    // Arrange
    const { service, battle, incomingWrite } = setup({
      substituteHp: 25,
      leechSeed: true,
      choiceLockedMoveId: 3,
    });

    // Act
    await service.executeSwitch(battle, 1, INCOMING_ID * 100, { transfer: 'batonPass' });

    // Assert
    expect(incomingWrite()).toMatchObject({
      isActive: true,
      attackRank: 2,
      speedRank: 2,
      volatileState: { substituteHp: 25, leechSeed: true, switchedInTurn: 4 },
    });
    expect(incomingWrite().volatileState.choiceLockedMoveId).toBeUndefined();
  });

  it('しっぽきりでは、みがわりだけを引き継ぐ', async () => {
    // Arrange
    const { service, battle, incomingWrite } = setup({ substituteHp: 25, leechSeed: true });

    // Act
    await service.executeSwitch(battle, 1, INCOMING_ID * 100, { transfer: 'shedTail' });

    // Assert
    expect(incomingWrite().volatileState).toEqual({ substituteHp: 25, switchedInTurn: 4 });
    expect(incomingWrite().attackRank).toBeUndefined();
  });

  it('引き継ぎを指定しなければ、次のポケモンには場に出たターンだけを書く', async () => {
    // Arrange
    const { service, battle, incomingWrite } = setup({ substituteHp: 25 });

    // Act
    await service.executeSwitch(battle, 1, INCOMING_ID * 100);

    // Assert
    expect(incomingWrite()).toEqual({ isActive: true, volatileState: { switchedInTurn: 4 } });
  });

  it('findSwitchBlocker は、逃げられない状態のポケモンの交代できない理由を返す', async () => {
    // Arrange
    const { service, leaving } = setup({ trappedByStatusId: 3 });

    // Act
    const blocker = await service.findSwitchBlocker(leaving);

    // Assert
    expect(blocker).toBe('trapped');
  });

  it('findSwitchBlocker は、ゴーストタイプなら逃げられない状態でも undefined を返す', async () => {
    // Arrange
    const { service, leaving } = setup({ trappedByStatusId: 3 }, new Type(8, 'ゴースト', 'Ghost'));

    // Act
    const blocker = await service.findSwitchBlocker(leaving);

    // Assert
    expect(blocker).toBeUndefined();
  });
});
