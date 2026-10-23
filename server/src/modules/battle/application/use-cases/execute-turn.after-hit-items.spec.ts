import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { ItemRegistry } from '@/modules/pokemon/domain/items/item-registry';
import {
  HarnessPokemon,
  createBattleEngine,
  createTestMove,
} from '../__tests__/battle-engine-harness';

/**
 * 技を当てた・受けたあとに働く持ち物（ゴツゴツメット・おうじゃのしるし・かいがらのすず）を、エンジン全体で確かめる
 * トレーナー 1: 場の 1（速い）。トレーナー 2: 場の 2。最大 HP は 160
 */
describe('ExecuteTurnUseCase - 技を当てた・受けたあとの持ち物', () => {
  const TACKLE = createTestMove(1, 'たいあたり', { power: 40 });
  const SPLASH = createTestMove(2, 'はねる', { category: MoveCategory.Status });
  const DOUBLE_KICK = createTestMove(3, 'にどげり', { type: 'かくとう', power: 30 });
  const WATER_GUN = createTestMove(4, 'みずでっぽう', {
    type: 'みず',
    category: MoveCategory.Special,
    power: 40,
  });
  const moves = [TACKLE, SPLASH, DOUBLE_KICK, WATER_GUN];
  const allMoveIds = moves.map(m => m.id);

  const setup = (options: { p1?: Partial<HarnessPokemon>; p2?: Partial<HarnessPokemon> } = {}) =>
    createBattleEngine({
      moves,
      pokemon: [
        { id: 1, trainerId: 1, active: true, baseSpeed: 150, moveIds: allMoveIds, ...options.p1 },
        { id: 2, trainerId: 2, active: true, baseSpeed: 50, moveIds: allMoveIds, ...options.p2 },
      ],
    });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
    ItemRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ゴツゴツメット', () => {
    const HELMET = { persistentState: { item: 'ゴツゴツメット' } };

    it('接触技を受けると、攻撃側の HP を最大 HP の 1/6 減らす', async () => {
      // Arrange
      const engine = setup({ p2: HELMET });

      // Act
      const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).currentHp).toBe(160 - Math.floor(160 / 6));
      expect(result.actions[0].result).toContain('ゴツゴツメット activated!');
    });

    it('接触しない技では、攻撃側の HP を減らさない', async () => {
      // Arrange
      const engine = setup({ p2: HELMET });

      // Act
      await engine.runTurn({ moveId: WATER_GUN.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).currentHp).toBe(160);
    });

    it('連続技は、接触したヒットのたびに減らす', async () => {
      // Arrange
      const engine = setup({ p2: HELMET });

      // Act
      await engine.runTurn({ moveId: DOUBLE_KICK.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).currentHp).toBe(160 - Math.floor(160 / 6) * 2);
    });

    it('攻撃側がマジックガードなら、HP を減らさない', async () => {
      // Arrange
      const engine = setup({ p1: { ability: 'マジックガード' }, p2: HELMET });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).currentHp).toBe(160);
    });

    it('みがわりに当たったときは、HP を減らさない', async () => {
      // Arrange
      const engine = setup({ p2: { ...HELMET, volatileState: { substituteHp: 100 } } });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).currentHp).toBe(160);
    });
  });

  describe('おうじゃのしるし', () => {
    it('攻撃技でダメージを与えると、10% で相手をひるませる（相手はそのターン動けない）', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0.05);
      const engine = setup({ p1: { persistentState: { item: 'おうじゃのしるし' } } });

      // Act
      const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: TACKLE.id });

      // Assert
      expect(result.actions[0].result).toContain('flinched!');
      expect(engine.status(1).currentHp).toBe(160);
    });

    it('10% の判定に外れると、ひるませない', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0.1);
      const engine = setup({ p1: { persistentState: { item: 'おうじゃのしるし' } } });

      // Act
      const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: TACKLE.id });

      // Assert
      expect(result.actions[0].result).not.toContain('flinched!');
      expect(engine.status(1).currentHp).toBeLessThan(160);
    });

    it('相手がりんぷんなら、ひるませない', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0.05);
      const engine = setup({
        p1: { persistentState: { item: 'おうじゃのしるし' } },
        p2: { ability: 'りんぷん' },
      });

      // Act
      const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: TACKLE.id });

      // Assert
      expect(result.actions[0].result).not.toContain('flinched!');
    });
  });

  describe('かいがらのすず', () => {
    it('攻撃技でダメージを与えると、与えたダメージの 1/8 を回復する', async () => {
      // Arrange
      const engine = setup({
        p1: { currentHp: 100, persistentState: { item: 'かいがらのすず' } },
      });

      // Act
      const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      const dealt = 160 - engine.status(2).currentHp;
      expect(dealt).toBeGreaterThan(0);
      expect(engine.status(1).currentHp).toBe(100 + Math.max(1, Math.floor(dealt / 8)));
      expect(result.actions[0].result).toContain('かいがらのすず');
    });

    it('連続技は、全ヒットの合計の 1/8 を 1 回だけ回復する', async () => {
      // Arrange
      const engine = setup({
        p1: { currentHp: 100, persistentState: { item: 'かいがらのすず' } },
      });

      // Act
      await engine.runTurn({ moveId: DOUBLE_KICK.id }, { moveId: SPLASH.id });

      // Assert
      const dealt = 160 - engine.status(2).currentHp;
      expect(engine.status(1).currentHp).toBe(100 + Math.max(1, Math.floor(dealt / 8)));
    });

    it('みがわりに当たったときは回復しない', async () => {
      // Arrange
      const engine = setup({
        p1: { currentHp: 100, persistentState: { item: 'かいがらのすず' } },
        p2: { volatileState: { substituteHp: 100 } },
      });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).currentHp).toBe(100);
    });

    it('防御側が持っていても回復しない', async () => {
      // Arrange
      const engine = setup({
        p2: { currentHp: 100, persistentState: { item: 'かいがらのすず' } },
      });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBeLessThan(100);
    });
  });
});
