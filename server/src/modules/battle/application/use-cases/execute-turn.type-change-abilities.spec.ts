import { Field } from '../../domain/entities/battle.entity';
import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { setTerrain } from '@/modules/pokemon/domain/battle-events/field-state';
import {
  HarnessPokemon,
  createBattleEngine,
  createTestMove,
} from '../__tests__/battle-engine-harness';

/**
 * タイプを変える特性（フェアリースキン・スカイスキン・エレキスキン・リベロ・ぎたい）（エンジン全体）
 * 威力 50 の物理技は、実数値 120 どうしでタイプ一致なしなら 24、タイプ一致なら 36 ダメージ
 */
describe('ExecuteTurnUseCase - タイプを変える特性', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const TACKLE = createTestMove(2, 'たいあたり');
  const EMBER = createTestMove(3, 'ひのこ', { type: 'ほのお' });
  const TERRAIN = createTestMove(4, 'エレキフィールド', {
    category: MoveCategory.Status,
    type: 'でんき',
  });
  const DEFOG = createTestMove(5, 'きりばらい', { category: MoveCategory.Status, type: 'ひこう' });
  const MOVES = [SPLASH, TACKLE, EMBER, TERRAIN, DEFOG];
  const ALL_MOVES = MOVES.map(move => move.id);

  const setup = (
    attacker: Partial<HarnessPokemon> = {},
    defender: Partial<HarnessPokemon> = {},
    options: { field?: Field; terrainTurns?: number; bench?: Partial<HarnessPokemon> } = {},
  ) =>
    createBattleEngine({
      moves: MOVES,
      field: options.field,
      sideState:
        options.terrainTurns !== undefined
          ? { global: { terrainTurns: options.terrainTurns } }
          : {},
      pokemon: [
        { id: 1, trainerId: 1, active: true, moveIds: ALL_MOVES, ...attacker },
        { id: 2, trainerId: 2, active: true, moveIds: ALL_MOVES, baseSpeed: 50, ...defender },
        ...(options.bench ? [{ id: 3, trainerId: 1, moveIds: ALL_MOVES, ...options.bench }] : []),
      ],
    });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
    // ひのこの追加効果（10% のやけど）で、ターン終了時の HP が揺れないようにする
    MoveRegistry.register('ひのこ', {});
    MoveRegistry.register('エレキフィールド', {
      onUse: async (_a, _d, ctx) =>
        (await setTerrain(ctx, Field.ElectricTerrain))
          ? 'An electric current ran across the battlefield!'
          : 'But it failed',
    });
  });

  describe('-スキン系', () => {
    it('フェアリースキンのノーマル技はフェアリー技になり、ゴーストタイプにも当たる（威力 1.2 倍）', async () => {
      // Arrange: 使用者はノーマルタイプなので、タイプ一致はなくなる
      const engine = setup({ ability: 'フェアリースキン' }, { types: ['ゴースト'] });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert: 威力 60 でタイプ一致なし → 28
      expect(engine.status(2).currentHp).toBe(160 - 28);
    });

    it('スカイスキンで変わったひこう技は、ひこうタイプの使用者ならタイプ一致になる', async () => {
      // Arrange
      const engine = setup({ ability: 'スカイスキン', types: ['ひこう'] });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert: 威力 60・タイプ一致 → 42
      expect(engine.status(2).currentHp).toBe(160 - 42);
    });

    it('エレキスキンで変わったでんき技は、じめんタイプに効かない', async () => {
      // Arrange
      const engine = setup({ ability: 'エレキスキン' }, { types: ['じめん'] });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(160);
    });

    it('ノーマル以外の技は変えず、威力も 1.2 倍にしない', async () => {
      // Arrange
      const engine = setup({ ability: 'フェアリースキン' });

      // Act
      await engine.runTurn({ moveId: EMBER.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(160 - 24);
    });
  });

  describe('リベロ', () => {
    it('技を出す直前に技のタイプになり、その技からタイプ一致になる', async () => {
      // Arrange
      const engine = setup({ ability: 'リベロ', types: ['みず'] });

      // Act
      const result = await engine.runTurn({ moveId: EMBER.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).volatileState.typeOverride).toEqual(['ほのお']);
      expect(engine.status(1).volatileState.typeChangeAbilityUsed).toBe(true);
      expect(engine.status(2).currentHp).toBe(160 - 36);
      expect(result.actions[0].result).toBe(
        'became the ほのお type! Used ひのこ and dealt 36 damage',
      );
    });

    it('場に出ている間に 2 回目は発動しない', async () => {
      // Arrange
      const engine = setup({ ability: 'リベロ', types: ['みず'] });
      await engine.runTurn({ moveId: EMBER.id }, { moveId: SPLASH.id });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert: ほのおタイプのまま、たいあたりはタイプ一致なし
      expect(engine.status(1).volatileState.typeOverride).toEqual(['ほのお']);
      expect(engine.status(2).currentHp).toBe(160 - 36 - 24);
    });

    it('すでに技のタイプだけなら変わらず、回数も使わない', async () => {
      // Arrange
      const engine = setup({ ability: 'リベロ', types: ['ノーマル'] });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).volatileState.typeOverride).toBeUndefined();
      expect(engine.status(1).volatileState.typeChangeAbilityUsed).toBeUndefined();
    });

    it('変化技でも技のタイプになる', async () => {
      // Arrange
      const engine = setup({ ability: 'リベロ', types: ['みず'] });

      // Act
      await engine.runTurn({ moveId: SPLASH.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).volatileState.typeOverride).toEqual(['ノーマル']);
    });
  });
});
