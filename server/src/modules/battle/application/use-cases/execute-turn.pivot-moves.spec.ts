import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import {
  HarnessPokemon,
  createBattleEngine,
  createTestMove,
} from '../__tests__/battle-engine-harness';

/**
 * とんぼがえり・ボルトチェンジ・クイックターン（攻撃して自分が交代する技）と、
 * ドラゴンテール・ともえなげ（攻撃して相手を交代させる技）を、登録された本物の技の効果で動かす
 * トレーナー 1: 場の 1、控えの 3。トレーナー 2: 場の 2、控えの 4。最大 HP は 160。
 * 1 は素早さが高く先に動く
 */
describe('ExecuteTurnUseCase - 攻撃して交代する技・交代させる技', () => {
  const U_TURN = createTestMove(1, 'とんぼがえり', { type: 'むし', power: 70 });
  const VOLT_SWITCH = createTestMove(2, 'ボルトチェンジ', {
    type: 'でんき',
    category: MoveCategory.Special,
    power: 70,
  });
  const FLIP_TURN = createTestMove(3, 'クイックターン', { type: 'みず', power: 60 });
  const DRAGON_TAIL = createTestMove(4, 'ドラゴンテール', {
    type: 'ドラゴン',
    power: 60,
    priority: -6,
  });
  const CIRCLE_THROW = createTestMove(5, 'ともえなげ', {
    type: 'かくとう',
    power: 60,
    priority: -6,
  });
  const TACKLE = createTestMove(6, 'たいあたり');
  const SPLASH = createTestMove(7, 'はねる', { category: MoveCategory.Status });
  const SUBSTITUTE = createTestMove(8, 'みがわり', { category: MoveCategory.Status });
  const moves = [
    U_TURN,
    VOLT_SWITCH,
    FLIP_TURN,
    DRAGON_TAIL,
    CIRCLE_THROW,
    TACKLE,
    SPLASH,
    SUBSTITUTE,
  ];
  const allMoveIds = moves.map(m => m.id);

  const setup = (
    options: {
      p1?: Partial<HarnessPokemon>;
      p2?: Partial<HarnessPokemon>;
      p3?: Partial<HarnessPokemon> | null;
      p4?: Partial<HarnessPokemon> | null;
    } = {},
  ) =>
    createBattleEngine({
      moves,
      pokemon: [
        { id: 1, trainerId: 1, active: true, baseSpeed: 150, moveIds: allMoveIds, ...options.p1 },
        { id: 2, trainerId: 2, active: true, baseSpeed: 50, moveIds: allMoveIds, ...options.p2 },
        ...(options.p3 === null
          ? []
          : [{ id: 3, trainerId: 1, moveIds: allMoveIds, ...options.p3 }]),
        ...(options.p4 === null
          ? []
          : [{ id: 4, trainerId: 2, moveIds: allMoveIds, ...options.p4 }]),
      ],
    });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
  });

  describe('とんぼがえり・ボルトチェンジ・クイックターン', () => {
    it.each([
      ['とんぼがえり', U_TURN],
      ['ボルトチェンジ', VOLT_SWITCH],
      ['クイックターン', FLIP_TURN],
    ])(
      '%s を当てると、使用者が控えと交代し、相手の技は出てきたポケモンが受ける',
      async (_name, move) => {
        // Arrange
        const engine = setup();

        // Act
        const result = await engine.runTurn({ moveId: move.id }, { moveId: TACKLE.id });

        // Assert
        expect(engine.status(2).currentHp).toBeLessThan(160);
        expect(engine.active(1)?.id).toBe(3);
        expect(engine.status(3).currentHp).toBeLessThan(160);
        expect(result.actions.map(a => [a.trainerId, a.action])).toEqual([
          [1, 'move'],
          [1, 'switch'],
          [2, 'move'],
        ]);
      },
    );

    it('控えがいなければ、とんぼがえりを当てても交代しない', async () => {
      // Arrange
      const engine = setup({ p3: null });

      // Act
      await engine.runTurn({ moveId: U_TURN.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBeLessThan(160);
      expect(engine.active(1)?.id).toBe(1);
    });

    it('控えがひんしだけなら、とんぼがえりを当てても交代しない', async () => {
      // Arrange
      const engine = setup({ p3: { currentHp: 0 } });

      // Act
      await engine.runTurn({ moveId: U_TURN.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.active(1)?.id).toBe(1);
    });

    it('とんぼがえりで相手をひんしにしても、使用者は交代する', async () => {
      // Arrange
      const engine = setup({ p2: { currentHp: 1 } });

      // Act
      await engine.runTurn({ moveId: U_TURN.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(0);
      expect(engine.active(1)?.id).toBe(3);
    });

    it('じめんタイプの相手にボルトチェンジを出すと、ダメージがなく交代もしない', async () => {
      // Arrange
      const engine = setup({ p2: { types: ['じめん'] } });

      // Act
      await engine.runTurn({ moveId: VOLT_SWITCH.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(160);
      expect(engine.active(1)?.id).toBe(1);
    });

    it('とんぼがえりがみがわりに当たっても、使用者は交代する', async () => {
      // Arrange
      const engine = setup({ p2: { volatileState: { substituteHp: 40 } } });

      // Act
      await engine.runTurn({ moveId: U_TURN.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(160);
      expect(engine.active(1)?.id).toBe(3);
    });

    it('相手のさめはだで使用者がひんしになったら、とんぼがえりでも交代しない', async () => {
      // Arrange
      const engine = setup({ p1: { currentHp: 10 }, p2: { ability: 'さめはだ' } });

      // Act
      await engine.runTurn({ moveId: U_TURN.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).currentHp).toBe(0);
      expect(engine.status(3).isActive).toBe(false);
    });
  });

  describe('ドラゴンテール・ともえなげ', () => {
    it.each([
      ['ドラゴンテール', DRAGON_TAIL],
      ['ともえなげ', CIRCLE_THROW],
    ])('%s は後から動き、ダメージを与えたあと相手を控えと入れ替える', async (_name, move) => {
      // Arrange
      const engine = setup();

      // Act
      const result = await engine.runTurn({ moveId: move.id }, { moveId: TACKLE.id });

      // Assert
      expect(engine.status(2).currentHp).toBeLessThan(160);
      expect(engine.active(2)?.id).toBe(4);
      expect(result.actions.map(a => [a.trainerId, a.action])).toEqual([
        [2, 'move'],
        [1, 'move'],
        [2, 'switch'],
      ]);
      expect(result.actions).toContainEqual({
        trainerId: 2,
        action: 'switch',
        result: 'Pokemon was dragged out! Pokemon switched to ID: 4',
      });
    });

    it('相手に控えがいなければ、ダメージだけ与えて入れ替えない', async () => {
      // Arrange
      const engine = setup({ p4: null });

      // Act
      await engine.runTurn({ moveId: DRAGON_TAIL.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBeLessThan(160);
      expect(engine.active(2)?.id).toBe(2);
    });

    it('みがわりに当たったときは、相手を入れ替えない', async () => {
      // Arrange
      const engine = setup({ p2: { volatileState: { substituteHp: 40 } } });

      // Act
      await engine.runTurn({ moveId: CIRCLE_THROW.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(160);
      expect(engine.active(2)?.id).toBe(2);
    });

    it('ねをはっている相手は入れ替えない', async () => {
      // Arrange
      const engine = setup({ p2: { volatileState: { ingrain: true } } });

      // Act
      await engine.runTurn({ moveId: DRAGON_TAIL.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBeLessThan(160);
      expect(engine.active(2)?.id).toBe(2);
    });

    it('きゅうばんの相手は入れ替えない', async () => {
      // Arrange
      const engine = setup({ p2: { ability: 'きゅうばん' } });

      // Act
      await engine.runTurn({ moveId: DRAGON_TAIL.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBeLessThan(160);
      expect(engine.active(2)?.id).toBe(2);
    });

    it('相手をひんしにしたときは、入れ替えない', async () => {
      // Arrange
      const engine = setup({ p2: { currentHp: 1 } });

      // Act
      const result = await engine.runTurn({ moveId: DRAGON_TAIL.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(0);
      expect(result.actions.map(a => a.result)).not.toContain(
        'Pokemon was dragged out! Pokemon switched to ID: 4',
      );
    });

    it('相手のさめはだで使用者がひんしになったら、相手を入れ替えない', async () => {
      // Arrange
      const engine = setup({ p1: { currentHp: 10 }, p2: { ability: 'さめはだ' } });

      // Act
      await engine.runTurn({ moveId: DRAGON_TAIL.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).currentHp).toBe(0);
      expect(engine.status(2).currentHp).toBeLessThan(160);
      expect(engine.active(2)?.id).toBe(2);
    });
  });
});
