import { Battle, BattleStatus, Field } from '../../domain/entities/battle.entity';
import { SideState } from '../../domain/state/side-state';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { Move, MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import {
  ATTACKER_ID,
  DEFENDER_ID,
  MoveExecutorSetupOptions,
  createMove,
  createStatus,
  createTrainedPokemon,
  setupMoveExecutor,
} from './__tests__/move-executor-test-setup';

/**
 * MoveExecutorService が場の状態（じゅうりょく・ゲンシ天候・サイコフィールド）で技を止めることを確かめる
 */
describe('MoveExecutorService - 場の状態', () => {
  const setup = (
    sideState: SideState,
    options: MoveExecutorSetupOptions = {},
    field: Field | null = null,
  ) => {
    const context = setupMoveExecutor(options);
    const battle = new Battle(1, 1, 2, 1, 2, 1, null, field, BattleStatus.Active, null, sideState);
    const execute = () =>
      context.service.executeMove(
        battle,
        1,
        1,
        context.statuses.get(ATTACKER_ID)!,
        context.statuses.get(DEFENDER_ID)!,
        1,
      );
    return { ...context, battle, execute };
  };

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('じゅうりょく', () => {
    it('じゅうりょくの間は、とびげりを出せず、PP も減らない', async () => {
      // Arrange
      const { execute, battleRepository, statuses } = setup(
        { global: { gravityTurns: 3 } },
        { move: createMove('とびげり') },
      );

      // Act
      const message = await execute();

      // Assert
      expect(message).toBe('Cannot use とびげり because of gravity');
      expect(battleRepository.updateBattlePokemonMove).not.toHaveBeenCalled();
      expect(statuses.get(DEFENDER_ID)!.currentHp).toBe(100);
    });

    it('じゅうりょくの間は、ゆびをふるなどで呼ばれたとびげりも失敗する', async () => {
      // Arrange
      const caller = createMove('テストよびだし', MoveCategory.Status, null);
      const called = new Move(
        2,
        'とびげり',
        'とびげり',
        caller.type,
        MoveCategory.Physical,
        100,
        95,
        10,
        0,
        null,
      );
      const { execute, statuses } = setup(
        { global: { gravityTurns: 3 } },
        {
          move: caller,
          moves: [caller, called],
          moveEffects: {
            テストよびだし: {
              onUse: (_a, _d, ctx) => ctx.callMove!({ moveId: 2, calledBy: 'テストよびだし' }),
            },
          },
        },
      );

      // Act
      const message = await execute();

      // Assert
      expect(message).toBe('Used テストよびだし Cannot use とびげり because of gravity');
      expect(statuses.get(DEFENDER_ID)!.currentHp).toBe(100);
    });
  });

  describe('ゲンシ天候', () => {
    const FIRE = new Type(3, 'ほのお', 'Fire');
    const WATER = new Type(4, 'みず', 'Water');
    const typedMove = (name: string, type: Type, category = MoveCategory.Special): Move =>
      new Move(
        1,
        name,
        name,
        type,
        category,
        category === MoveCategory.Status ? null : 90,
        100,
        10,
        0,
        null,
      );

    it('おおあめの間は、ほのおの攻撃技が失敗する', async () => {
      // Arrange
      const { execute, statuses } = setup(
        { global: { primalWeather: 'heavyRain', weatherSourceStatusId: DEFENDER_ID } },
        { move: typedMove('かえんほうしゃ', FIRE) },
      );

      // Act
      const message = await execute();

      // Assert
      expect(message).toBe(
        'Used かえんほうしゃ but the Fire-type attack fizzled out in the heavy rain',
      );
      expect(statuses.get(DEFENDER_ID)!.currentHp).toBe(100);
    });

    it('おおあめの間は、ふんじんをかけられていても爆発せず、ほのおの攻撃技が消える', async () => {
      // Arrange
      const { execute, statuses } = setup(
        { global: { primalWeather: 'heavyRain', weatherSourceStatusId: DEFENDER_ID } },
        { move: typedMove('かえんほうしゃ', FIRE), attacker: { volatileState: { powder: true } } },
      );

      // Act
      const message = await execute();

      // Assert
      expect(message).toBe(
        'Used かえんほうしゃ but the Fire-type attack fizzled out in the heavy rain',
      );
      expect(statuses.get(ATTACKER_ID)!.currentHp).toBe(100);
    });

    it('おおひでりの間は、みずの攻撃技が失敗する', async () => {
      // Arrange
      const { execute } = setup(
        { global: { primalWeather: 'harshSunlight', weatherSourceStatusId: DEFENDER_ID } },
        { move: typedMove('なみのり', WATER) },
      );

      // Act
      const message = await execute();

      // Assert
      expect(message).toBe(
        'Used なみのり but the Water-type attack evaporated in the harsh sunlight',
      );
    });

    it('おおあめでも、ノーてんきが場にいれば、ほのお技は失敗しない', async () => {
      // Arrange
      const { execute, statuses } = setup(
        { global: { primalWeather: 'heavyRain', weatherSourceStatusId: DEFENDER_ID } },
        { move: typedMove('かえんほうしゃ', FIRE), attackerAbility: 'ノーてんき' },
      );

      // Act
      await execute();

      // Assert
      expect(statuses.get(DEFENDER_ID)!.currentHp).toBe(90);
    });
  });

  describe('サイコフィールド', () => {
    it('サイコフィールドの間は、地面にいる相手への優先度の高い技が失敗する', async () => {
      // Arrange
      const { execute, statuses } = setup(
        {},
        { move: createMove('でんこうせっか', MoveCategory.Physical, 40, 1) },
        Field.PsychicTerrain,
      );

      // Act
      const message = await execute();

      // Assert
      expect(message).toBe('Used でんこうせっか but it failed (Psychic Terrain)');
      expect(statuses.get(DEFENDER_ID)!.currentHp).toBe(100);
    });

    it('サイコフィールドでも、地面にいない相手には優先度の高い技が当たる', async () => {
      // Arrange
      const { execute, statuses, trainedPokemons } = setup(
        {},
        { move: createMove('でんこうせっか', MoveCategory.Physical, 40, 1) },
        Field.PsychicTerrain,
      );
      trainedPokemons.set(
        DEFENDER_ID,
        createTrainedPokemon(DEFENDER_ID, undefined, { primary: new Type(6, 'ひこう', 'Flying') }),
      );

      // Act
      await execute();

      // Assert
      expect(statuses.get(DEFENDER_ID)!.currentHp).toBe(90);
    });
  });

  describe('ひんしの仲間の数（そうだいしょう）', () => {
    it('ダメージ技のコンテキストに、自分以外の手持ちがひんしになった延べ数が入る', async () => {
      // Arrange
      const { execute, battleRepository, statuses, calculate } = setup({});
      const fainted = createStatus(3, { trainerId: 1, isActive: false, currentHp: 0 });
      const revived = createStatus(4, {
        trainerId: 1,
        isActive: false,
        persistentState: { revivalCount: 1 },
      });
      battleRepository.findBattlePokemonStatusByBattleId.mockResolvedValue([
        ...statuses.values(),
        fainted,
        revived,
      ]);

      // Act
      await execute();

      // Assert
      expect(calculate.mock.calls[0][0].battleContext?.attackerFaintedAllyCount).toBe(2);
    });
  });
});
