import { Battle, BattleStatus, Field } from '../../domain/entities/battle.entity';
import { SideState } from '../../domain/state/side-state';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import {
  ATTACKER_ID,
  DEFENDER_ID,
  MoveExecutorSetupOptions,
  createMove,
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
  });
});
