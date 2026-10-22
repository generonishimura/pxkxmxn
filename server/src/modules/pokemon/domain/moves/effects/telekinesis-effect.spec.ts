import { TelekinesisEffect } from './telekinesis-effect';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { MoveRegistry } from '../move-registry';
import { TrainedPokemon } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('TelekinesisEffect（テレキネシス）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  /** 相手（ID 2）の図鑑番号を変えたバトルを作る */
  const setupWithDefenderDex = (nationalDex: number) => {
    const battle = createInMemoryBattle();
    const original = battle.trainedPokemonRepository.findById.getMockImplementation()!;
    battle.trainedPokemonRepository.findById.mockImplementation(async (id: number) => {
      const trained = await original(id);
      if (id !== 2 || !trained) {
        return trained;
      }
      return { ...trained, pokemon: { ...trained.pokemon, nationalDex } } as TrainedPokemon;
    });
    return battle;
  };

  describe('onUse', () => {
    it('相手を 3 ターンのテレキネシス状態にする', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const message = await new TelekinesisEffect().onUse(get(1), get(2), context());

      // Assert
      expect(get(2).volatileState.telekinesisTurns).toBe(3);
      expect(message).toBe('was hurled into the air!');
    });

    it('相手がすでにテレキネシス状態なら失敗する', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { status: { volatileState: { telekinesisTurns: 1 } } },
      );

      // Act
      const message = await new TelekinesisEffect().onUse(get(1), get(2), context());

      // Assert
      expect(get(2).volatileState.telekinesisTurns).toBe(1);
      expect(message).toBe('But it failed');
    });

    it('相手がねをはるで根を張っていれば失敗する', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { status: { volatileState: { ingrain: true } } },
      );

      // Act
      const message = await new TelekinesisEffect().onUse(get(1), get(2), context());

      // Assert
      expect(get(2).volatileState.telekinesisTurns).toBeUndefined();
      expect(message).toBe('But it failed');
    });

    it.each([
      [50, 'ディグダ'],
      [51, 'ダグトリオ'],
      [769, 'スナバァ'],
      [770, 'シロデスナ'],
    ])('相手が図鑑番号 %i（%s）なら効かない', async nationalDex => {
      // Arrange
      const { context, get } = setupWithDefenderDex(nationalDex);

      // Act
      const message = await new TelekinesisEffect().onUse(get(1), get(2), context());

      // Assert
      expect(get(2).volatileState.telekinesisTurns).toBeUndefined();
      expect(message).toBe('But it failed');
    });

    it('相手がひんしなら失敗する', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { status: { currentHp: 0 } });

      // Act
      const message = await new TelekinesisEffect().onUse(get(1), get(2), context());

      // Assert
      expect(get(2).volatileState.telekinesisTurns).toBeUndefined();
      expect(message).toBe('But it failed');
    });
  });

  describe('shouldFail', () => {
    it('じゅうりょくの間は失敗する', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      await battleRepository.patchGlobalFieldState(1, { gravityTurns: 3 });

      // Act
      const failed = new TelekinesisEffect().shouldFail(get(1), get(2), context());

      // Assert
      expect(failed).toBe(true);
    });

    it('じゅうりょくでなければ失敗しない', () => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const failed = new TelekinesisEffect().shouldFail(get(1), get(2), context());

      // Assert
      expect(failed).toBe(false);
    });
  });

  it('MoveRegistry に テレキネシス として登録されている', () => {
    // Arrange
    MoveRegistry.initialize();

    // Act
    const effect = MoveRegistry.get('テレキネシス');

    // Assert
    expect(effect).toBeInstanceOf(TelekinesisEffect);
  });
});
