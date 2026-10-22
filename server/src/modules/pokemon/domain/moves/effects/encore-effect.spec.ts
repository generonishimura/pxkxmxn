import { EncoreEffect } from './encore-effect';
import { createMove } from './__tests__/test-helpers';
import { MoveCategory } from '../../entities/move.entity';
import { Type } from '../../entities/type.entity';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { IMoveRepository } from '../../pokemon.repository.interface';
import { BattlePokemonMove } from '@/modules/battle/domain/entities/battle-pokemon-move.entity';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('EncoreEffect（アンコール）', () => {
  const effect = new EncoreEffect();
  const normal = new Type(1, 'ノーマル', 'Normal');
  const tackle = createMove('たいあたり', 'Tackle', normal, MoveCategory.Physical, { id: 33 });
  const struggle = createMove('わるあがき', 'Struggle', normal, MoveCategory.Physical, {
    id: 165,
  });
  const moves = new Map([
    [tackle.id, tackle],
    [struggle.id, struggle],
  ]);
  const moveRepository: jest.Mocked<IMoveRepository> = {
    findById: jest.fn((id: number) => Promise.resolve(moves.get(id) ?? null)),
    findByPokemonId: jest.fn(),
  };

  /** 相手（ID 2）が最後に出した技と、覚えている技の欄を持つバトル */
  const setUp = (lastMoveId: number, currentPp = 10, ability?: string) => {
    const battle = createInMemoryBattle({}, { ability, status: { volatileState: { lastMoveId } } });
    battle.battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
      new BattlePokemonMove(1, 2, tackle.id, currentPp, 35),
    ]);
    return battle;
  };

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('shouldFail', () => {
    it('相手がまだ技を出していなければ失敗する', () => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const result = effect.shouldFail(get(1), get(2), context());

      // Assert
      expect(result).toBe(true);
    });

    it('相手がすでにアンコールされていれば失敗する', () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { status: { volatileState: { lastMoveId: tackle.id, encore: { moveId: 33, turns: 2 } } } },
      );

      // Act
      const result = effect.shouldFail(get(1), get(2), context());

      // Assert
      expect(result).toBe(true);
    });

    it('相手が技を出していてアンコールされていなければ失敗しない', () => {
      // Arrange
      const { context, get } = setUp(tackle.id);

      // Act
      const result = effect.shouldFail(get(1), get(2), context());

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('onUse', () => {
    it('相手がもう行動していれば、最後に出した技を 4 ターンのアンコールにする', async () => {
      // Arrange
      const { context, get } = setUp(tackle.id);

      // Act
      const message = await effect.onUse(
        get(1),
        get(2),
        context({ moveName: 'アンコール', moveRepository }),
      );

      // Assert
      expect(message).toBe('received an encore!');
      expect(get(2).volatileState.encore).toEqual({ moveId: tackle.id, turns: 4 });
    });

    it('相手がまだ行動していなければ、アンコールを 3 ターンにする', async () => {
      // Arrange
      const { context, get } = setUp(tackle.id);

      // Act
      await effect.onUse(
        get(1),
        get(2),
        context({ moveName: 'アンコール', moveRepository, defenderPendingMoveId: tackle.id }),
      );

      // Assert
      expect(get(2).volatileState.encore).toEqual({ moveId: tackle.id, turns: 3 });
    });

    it('最後に出した技がアンコールできない技（わるあがき）なら失敗する', async () => {
      // Arrange
      const { context, get } = setUp(struggle.id);

      // Act
      const message = await effect.onUse(
        get(1),
        get(2),
        context({ moveName: 'アンコール', moveRepository }),
      );

      // Assert
      expect(message).toBe('but it failed');
      expect(get(2).volatileState.encore).toBeUndefined();
    });

    it('最後に出した技の PP が 0 なら失敗する', async () => {
      // Arrange
      const { context, get } = setUp(tackle.id, 0);

      // Act
      const message = await effect.onUse(
        get(1),
        get(2),
        context({ moveName: 'アンコール', moveRepository }),
      );

      // Assert
      expect(message).toBe('but it failed');
      expect(get(2).volatileState.encore).toBeUndefined();
    });

    it('最後に出した技が技の欄にない（呼ばれた技など）なら失敗する', async () => {
      // Arrange
      const { context, get, battleRepository } = setUp(tackle.id);
      battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([]);

      // Act
      const message = await effect.onUse(
        get(1),
        get(2),
        context({ moveName: 'アンコール', moveRepository }),
      );

      // Assert
      expect(message).toBe('but it failed');
      expect(get(2).volatileState.encore).toBeUndefined();
    });

    it('相手の特性が受け付けなければ失敗する', async () => {
      // Arrange
      AbilityRegistry.register('テストアロマベール', {
        canReceiveVolatile: (_holder, kind) => (kind === 'encore' ? false : undefined),
      });
      const { context, get } = setUp(tackle.id, 10, 'テストアロマベール');

      // Act
      const message = await effect.onUse(
        get(1),
        get(2),
        context({ moveName: 'アンコール', moveRepository }),
      );

      // Assert
      expect(message).toBe('but it failed');
      expect(get(2).volatileState.encore).toBeUndefined();
    });
  });
});
