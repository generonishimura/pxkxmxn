import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { ItemRegistry } from '@/modules/pokemon/domain/items/item-registry';
import { VolatileState } from '../../domain/state/volatile-state';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * 威力・ダメージを上げる持ち物（エンジン全体）
 * どちらも能力 120・HP 160・ノーマルタイプ。威力 50 のノーマル技（タイプ一致）は 36 のダメージ
 */
describe('ExecuteTurnUseCase - 威力・ダメージを上げる持ち物', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const TACKLE = createTestMove(2, 'たいあたり');
  const SWIFT = createTestMove(3, 'スピードスター', { category: MoveCategory.Special });
  const ROCK_THROW = createTestMove(4, 'いわおとし', { type: 'いわ' });
  const DOUBLE_HIT = createTestMove(5, 'ダブルアタック');
  const EMBER = createTestMove(6, 'ひのこ', { type: 'ほのお', category: MoveCategory.Special });
  const moves = [SPLASH, TACKLE, SWIFT, ROCK_THROW, DOUBLE_HIT, EMBER];

  const setup = (
    options: {
      item?: string;
      ability?: string;
      nationalDex?: number;
      volatileState?: VolatileState;
      defenderTypes?: readonly string[];
      defenderVolatile?: VolatileState;
    } = {},
  ) =>
    createBattleEngine({
      moves,
      pokemon: [
        {
          id: 1,
          trainerId: 1,
          active: true,
          baseSpeed: 150,
          moveIds: [1, 2, 3, 4, 5, 6],
          ability: options.ability,
          nationalDex: options.nationalDex,
          volatileState: options.volatileState,
          persistentState: options.item ? { item: options.item } : {},
        },
        {
          id: 2,
          trainerId: 2,
          active: true,
          moveIds: [1],
          types: options.defenderTypes,
          volatileState: options.defenderVolatile,
        },
      ],
    });

  const damageTaken = (engine: ReturnType<typeof setup>): number =>
    160 - engine.status(2).currentHp;

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
    ItemRegistry.initialize();
  });

  describe('ちからのハチマキ', () => {
    it('物理技の威力を 1.1 倍（4505/4096）にする（威力 50 → 55）', async () => {
      // Arrange
      const engine = setup({ item: 'ちからのハチマキ' });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(39);
    });

    it('特殊技の威力は変えない', async () => {
      // Arrange
      const engine = setup({ item: 'ちからのハチマキ' });

      // Act
      await engine.runTurn({ moveId: SWIFT.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(36);
    });
  });

  describe('ものしりメガネ', () => {
    it('特殊技の威力を 1.1 倍（4505/4096）にする（威力 50 → 55）', async () => {
      // Arrange
      const engine = setup({ item: 'ものしりメガネ' });

      // Act
      await engine.runTurn({ moveId: SWIFT.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(39);
    });

    it('物理技の威力は変えない', async () => {
      // Arrange
      const engine = setup({ item: 'ものしりメガネ' });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(36);
    });
  });

  describe('たつじんのおび', () => {
    it('効果抜群の技のダメージを 1.2 倍（4915/4096）にする', async () => {
      // Arrange
      // いわ技（タイプ不一致）でほのおタイプに 2 倍: 24 × 2 = 48 → 1.2 倍で 57
      const engine = setup({ item: 'たつじんのおび', defenderTypes: ['ほのお'] });

      // Act
      await engine.runTurn({ moveId: ROCK_THROW.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(57);
    });

    it('効果抜群でない技のダメージは変えない', async () => {
      // Arrange
      const engine = setup({ item: 'たつじんのおび' });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(36);
    });
  });

  describe('いのちのたま', () => {
    it('ダメージを 1.3 倍（5324/4096）にし、技のあとに最大 HP の 1/10 を失う', async () => {
      // Arrange
      const engine = setup({ item: 'いのちのたま' });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(46);
      expect(engine.status(1).currentHp).toBe(144);
    });

    it('連続技でも、HP を失うのは技全体で 1 回だけ', async () => {
      // Arrange
      const engine = setup({ item: 'いのちのたま' });

      // Act
      await engine.runTurn({ moveId: DOUBLE_HIT.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).currentHp).toBe(144);
    });

    it('マジックガードなら HP を失わない', async () => {
      // Arrange
      const engine = setup({ item: 'いのちのたま', ability: 'マジックガード' });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).currentHp).toBe(160);
    });

    it('技が相手に効かなかったときは HP を失わない', async () => {
      // Arrange
      const engine = setup({ item: 'いのちのたま', defenderTypes: ['ゴースト'] });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).currentHp).toBe(160);
    });

    it('みがわりに当たったときも HP を失う', async () => {
      // Arrange
      const engine = setup({ item: 'いのちのたま', defenderVolatile: { substituteHp: 40 } });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).currentHp).toBe(144);
    });
  });

  describe('メトロノーム', () => {
    it('同じ技を続けて出すと、ダメージが 1 回ごとに 1.2 倍（4915/4096）ずつ上がる', async () => {
      // Arrange
      const engine = setup({ item: 'メトロノーム' });
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });
      const firstDamage = damageTaken(engine);

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(firstDamage).toBe(36);
      expect(damageTaken(engine) - firstDamage).toBe(43);
    });

    it('6 回目以降は 2 倍で止まる', async () => {
      // Arrange
      const engine = setup({
        item: 'メトロノーム',
        volatileState: { lastMoveId: TACKLE.id, consecutiveMoveCount: 7 },
      });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(72);
    });

    it('別の技を出したら、数え直す', async () => {
      // Arrange
      const engine = setup({
        item: 'メトロノーム',
        volatileState: { lastMoveId: TACKLE.id, consecutiveMoveCount: 3 },
      });

      // Act
      await engine.runTurn({ moveId: SWIFT.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(36);
    });
  });

  describe('ノーマルジュエル', () => {
    it('ノーマル技の威力を 1.3 倍（5325/4096）にし、使い切る（威力 50 → 65）', async () => {
      // Arrange
      const engine = setup({ item: 'ノーマルジュエル' });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(45);
      expect(engine.status(1).persistentState.item).toBeUndefined();
      expect(engine.status(1).persistentState.consumedItem).toBe('ノーマルジュエル');
    });

    it('連続技では、すべてのヒットの威力を上げてから使い切る', async () => {
      // Arrange
      const engine = setup({ item: 'ノーマルジュエル' });

      // Act
      await engine.runTurn({ moveId: DOUBLE_HIT.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(90);
      expect(engine.status(1).persistentState.item).toBeUndefined();
    });

    it('ノーマル技でなければ、威力を変えず、使い切らない', async () => {
      // Arrange
      const engine = setup({ item: 'ノーマルジュエル' });

      // Act
      await engine.runTurn({ moveId: EMBER.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(24);
      expect(engine.status(1).persistentState.item).toBe('ノーマルジュエル');
    });

    it('技が相手に効かなかったときは使い切らない', async () => {
      // Arrange
      const engine = setup({ item: 'ノーマルジュエル', defenderTypes: ['ゴースト'] });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).persistentState.item).toBe('ノーマルジュエル');
    });
  });

  describe('でんきだま', () => {
    it('ピカチュウ（全国図鑑 25）が持つと、物理技のダメージが 2 倍になる', async () => {
      // Arrange
      const engine = setup({ item: 'でんきだま', nationalDex: 25 });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(72);
    });

    it('ピカチュウが持つと、特殊技のダメージも 2 倍になる', async () => {
      // Arrange
      const engine = setup({ item: 'でんきだま', nationalDex: 25 });

      // Act
      await engine.runTurn({ moveId: SWIFT.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(72);
    });

    it('ピカチュウ以外が持っても、何もしない', async () => {
      // Arrange
      const engine = setup({ item: 'でんきだま', nationalDex: 26 });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(36);
    });
  });
});
