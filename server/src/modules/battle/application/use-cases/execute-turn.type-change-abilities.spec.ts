import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import {
  HarnessPokemon,
  createBattleEngine,
  createTestMove,
} from '../__tests__/battle-engine-harness';

/**
 * 自分のタイプ・技のタイプを変える特性（エンジン全体）
 * 威力 50 の物理技は、実数値 120 どうしでタイプ一致なしなら 24 ダメージ、タイプ一致なら 36 ダメージ
 */
describe('ExecuteTurnUseCase - タイプを変える特性', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const TACKLE = createTestMove(2, 'たいあたり');
  const EMBER = createTestMove(3, 'ひのこ', { type: 'ほのお' });
  const MOVES = [SPLASH, TACKLE, EMBER];
  const MOVE_IDS = MOVES.map(move => move.id);

  const setup = (attacker: Partial<HarnessPokemon> = {}, defender: Partial<HarnessPokemon> = {}) =>
    createBattleEngine({
      moves: MOVES,
      pokemon: [
        { id: 1, trainerId: 1, active: true, moveIds: MOVE_IDS, ...attacker },
        { id: 2, trainerId: 2, active: true, moveIds: MOVE_IDS, baseSpeed: 50, ...defender },
      ],
    });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
    // ひのこの追加効果（10% のやけど）で、ターン終了時の HP が揺れないようにする
    MoveRegistry.register('ひのこ', {});
  });

  describe('へんげんじざい', () => {
    it('技を出す前に技のタイプになり、タイプ一致で威力が上がる', async () => {
      // Arrange
      const engine = setup({ ability: 'へんげんじざい' });

      // Act
      const result = await engine.runTurn({ moveId: EMBER.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).volatileState.typeOverride).toEqual(['ほのお']);
      expect(engine.status(2).currentHp).toBe(160 - 36);
      expect(result.actions[0].result).toBe(
        'became the ほのお type! Used ひのこ and dealt 36 damage',
      );
    });

    it('場に出ている間は 1 回だけで、次の技ではタイプが変わらない', async () => {
      // Arrange
      const engine = setup({ ability: 'へんげんじざい' });
      await engine.runTurn({ moveId: EMBER.id }, { moveId: SPLASH.id });

      // Act
      const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert: ほのおタイプのままなので、たいあたりはタイプ一致にならない
      expect(engine.status(1).volatileState.typeOverride).toEqual(['ほのお']);
      expect(result.actions[0].result).toBe('Used たいあたり and dealt 24 damage');
    });
  });
});
