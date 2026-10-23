import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { Weather } from '../../domain/entities/battle.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { ItemRegistry } from '@/modules/pokemon/domain/items/item-registry';
import {
  HarnessPokemon,
  createBattleEngine,
  createTestMove,
} from '../__tests__/battle-engine-harness';

/**
 * 持ち物に関わる特性を、エンジン全体で確かめる
 * ポケモン 1 は素早さ種族値 150（速い）、ポケモン 2 は 50。最大 HP は 160（オボンのみで 40 回復する）
 */
describe('ExecuteTurnUseCase - 持ち物に関わる特性', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const TACKLE = createTestMove(2, 'たいあたり', { power: 40 });
  const PSYCHIC = createTestMove(3, 'サイコキネシス', {
    type: 'エスパー',
    category: MoveCategory.Special,
    power: 40,
  });
  const moves = [SPLASH, TACKLE, PSYCHIC];
  const allMoveIds = moves.map(move => move.id);

  const setup = (
    options: { p1?: Partial<HarnessPokemon>; p2?: Partial<HarnessPokemon>; turn?: number } = {},
  ) =>
    createBattleEngine({
      moves,
      turn: options.turn,
      pokemon: [
        { id: 1, trainerId: 1, active: true, baseSpeed: 150, moveIds: allMoveIds, ...options.p1 },
        { id: 2, trainerId: 2, active: true, baseSpeed: 50, moveIds: allMoveIds, ...options.p2 },
      ],
    });
  const splash = { moveId: SPLASH.id };

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
    ItemRegistry.initialize();
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('きのみを食べるときの特性', () => {
    it('HP が半分以下のオボンのみは、技を出し終えたときに食べる（比べるための基準）', async () => {
      // Arrange
      const engine = setup({ p1: { currentHp: 70, persistentState: { item: 'オボンのみ' } } });

      // Act
      await engine.runTurn(splash, splash);

      // Assert
      expect(engine.status(1).currentHp).toBe(110);
    });

    it('きんちょうかんの相手がいると、オボンのみを食べない', async () => {
      // Arrange
      const engine = setup({
        p1: { currentHp: 70, persistentState: { item: 'オボンのみ' } },
        p2: { ability: 'きんちょうかん' },
      });

      // Act
      await engine.runTurn(splash, splash);

      // Assert
      expect(engine.status(1).currentHp).toBe(70);
      expect(engine.status(1).persistentState.item).toBe('オボンのみ');
    });

    it('じゅくせいなら、オボンのみで最大 HP の 1/2 を回復する', async () => {
      // Arrange
      const engine = setup({
        p1: { ability: 'じゅくせい', currentHp: 70, persistentState: { item: 'オボンのみ' } },
      });

      // Act
      await engine.runTurn(splash, splash);

      // Assert
      expect(engine.status(1).currentHp).toBe(150);
    });

    it('ほおぶくろなら、オボンのみに加えて最大 HP の 1/3 を回復する', async () => {
      // Arrange
      const engine = setup({
        p1: { ability: 'ほおぶくろ', currentHp: 30, persistentState: { item: 'オボンのみ' } },
      });

      // Act
      const result = await engine.runTurn(splash, splash);

      // Assert
      expect(engine.status(1).currentHp).toBe(30 + 40 + 53);
      expect(result.actions[0].result).toContain('ほおぶくろ restored its HP!');
    });

    it('はんすうなら、食べた次のターンのターン終了時に、同じきのみをもう一度食べる', async () => {
      // Arrange
      const engine = setup({
        p1: { ability: 'はんすう', currentHp: 30, persistentState: { item: 'オボンのみ' } },
      });

      // Act
      await engine.runTurn(splash, splash);
      const afterFirstTurn = engine.status(1).currentHp;
      await engine.runTurn(splash, splash);

      // Assert
      expect(afterFirstTurn).toBe(70);
      expect(engine.status(1).currentHp).toBe(110);
      expect(engine.status(1).volatileState.cudChew).toBeUndefined();
    });
  });

  describe('かるわざ', () => {
    it('きのみを食べたあとは素早さが 2 倍になり、次のターンは速い相手より先に動く', async () => {
      // Arrange
      const engine = setup({
        p2: {
          ability: 'かるわざ',
          baseSpeed: 100,
          currentHp: 70,
          persistentState: { item: 'オボンのみ' },
        },
      });

      // Act
      const firstTurn = await engine.runTurn(splash, splash);
      const secondTurn = await engine.runTurn(splash, splash);

      // Assert
      expect(firstTurn.actions[0].trainerId).toBe(1);
      expect(engine.status(2).volatileState.unburden).toBe(true);
      expect(secondTurn.actions[0].trainerId).toBe(2);
    });

    it('持ち物を失ったあとでも、また持ち物を持っていれば素早さは 2 倍にならない', async () => {
      // Arrange
      const engine = setup({
        p2: {
          ability: 'かるわざ',
          baseSpeed: 100,
          volatileState: { unburden: true },
          persistentState: { item: 'たべのこし' },
        },
      });

      // Act
      const result = await engine.runTurn(splash, splash);

      // Assert
      expect(result.actions[0].trainerId).toBe(1);
    });
  });

  describe('ぶきよう', () => {
    const benchKlutz = (ability: string | undefined): Partial<HarnessPokemon>[] => [
      {
        id: 3,
        trainerId: 1,
        ability,
        currentHp: 100,
        moveIds: allMoveIds,
        persistentState: { item: 'たべのこし' },
      },
    ];
    const setupWithBench = (ability: string | undefined) =>
      createBattleEngine({
        moves,
        pokemon: [
          { id: 1, trainerId: 1, active: true, baseSpeed: 150, moveIds: allMoveIds },
          { id: 2, trainerId: 2, active: true, baseSpeed: 50, moveIds: allMoveIds },
          ...(benchKlutz(ability) as HarnessPokemon[]),
        ],
      });

    it('ぶきようでなければ、交代で出たポケモンのたべのこしはターン終了時に HP を回復する（比べるための基準）', async () => {
      // Arrange
      const engine = setupWithBench(undefined);

      // Act
      await engine.runTurn({ switchPokemonId: 3 }, splash);

      // Assert
      expect(engine.status(3).currentHp).toBe(110);
    });

    it('ぶきようのポケモンが場に出ると、持ち物の効果がなくなり、たべのこしで回復しない', async () => {
      // Arrange
      const engine = setupWithBench('ぶきよう');

      // Act
      await engine.runTurn({ switchPokemonId: 3 }, splash);

      // Assert
      expect(engine.status(3).volatileState.klutz).toBe(true);
      expect(engine.status(3).currentHp).toBe(100);
    });
  });

  describe('持ち物を拾う・奪う特性', () => {
    it('わるいてぐせは、接触技を受けたら攻撃側の持ち物を奪う', async () => {
      // Arrange
      const engine = setup({
        p1: { persistentState: { item: 'たべのこし' } },
        p2: { ability: 'わるいてぐせ' },
      });

      // Act
      const result = await engine.runTurn({ moveId: TACKLE.id }, splash);

      // Assert
      expect(engine.status(1).persistentState.item).toBeUndefined();
      expect(engine.status(2).persistentState.item).toBe('たべのこし');
      expect(result.actions[0].result).toContain("わるいてぐせ stole the attacker's たべのこし!");
    });

    it('わるいてぐせは、接触しない技では奪わない', async () => {
      // Arrange
      const engine = setup({
        p1: { persistentState: { item: 'たべのこし' } },
        p2: { ability: 'わるいてぐせ' },
      });

      // Act
      await engine.runTurn({ moveId: PSYCHIC.id }, splash);

      // Assert
      expect(engine.status(1).persistentState.item).toBe('たべのこし');
    });

    it('マジシャンは、攻撃技を当てたら相手の持ち物を奪い、奪ったいのちのたまの反動はその技では受けない', async () => {
      // Arrange
      const engine = setup({
        p1: { ability: 'マジシャン' },
        p2: { persistentState: { item: 'いのちのたま' } },
      });

      // Act
      const result = await engine.runTurn({ moveId: PSYCHIC.id }, splash);

      // Assert
      expect(engine.status(1).persistentState.item).toBe('いのちのたま');
      expect(engine.status(2).persistentState.item).toBeUndefined();
      expect(engine.status(1).currentHp).toBe(160);
      expect(result.actions[0].result).toContain("マジシャン stole the target's いのちのたま!");
    });

    it('しゅうかくは、晴れならターン終了時に、使い切ったきのみを必ず持ち直す', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0.99);
      const engine = createBattleEngine({
        moves,
        weather: Weather.Sun,
        pokemon: [
          {
            id: 1,
            trainerId: 1,
            active: true,
            baseSpeed: 150,
            moveIds: allMoveIds,
            ability: 'しゅうかく',
            persistentState: { consumedItem: 'オボンのみ' },
          },
          { id: 2, trainerId: 2, active: true, baseSpeed: 50, moveIds: allMoveIds },
        ],
      });

      // Act
      await engine.runTurn(splash, splash);

      // Assert
      expect(engine.status(1).persistentState.item).toBe('オボンのみ');
      expect(engine.status(1).persistentState.consumedItem).toBeUndefined();
    });

    it('ものひろいは、相手がこのターンに食べたきのみを、ターン終了時に拾う', async () => {
      // Arrange
      const engine = setup({
        p1: { ability: 'ものひろい' },
        p2: { currentHp: 70, persistentState: { item: 'オボンのみ' } },
      });

      // Act
      await engine.runTurn(splash, splash);

      // Assert
      expect(engine.status(2).currentHp).toBe(110);
      expect(engine.status(1).persistentState.item).toBe('オボンのみ');
      expect(engine.status(2).persistentState.consumedItem).toBeUndefined();
    });
  });
});
