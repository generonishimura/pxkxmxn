import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { ProtectionMoveConfig } from '@/modules/pokemon/domain/moves/move-effect.interface';
import { isContactMove } from '@/modules/pokemon/domain/moves/move-flags';
import { getSideConditions } from '../../domain/state/side-state';
import { VolatileState } from '../../domain/state/volatile-state';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * まもる系の技（エンジン全体）
 * まもる系は技の効果の protection を持つテスト用の技（本物の技の効果は別に作る）。
 * ポケモン 1 が技を受ける側の相手を攻撃し、ポケモン 2 がまもる系を使う。どちらも最大 HP 160。
 * たいあたり（威力 50・接触・タイプ一致）のダメージは 36
 */
describe('ExecuteTurnUseCase - まもる系', () => {
  const guardMove = (id: number, name: string, priority: number) =>
    createTestMove(id, name, { category: MoveCategory.Status, priority });

  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const TACKLE = createTestMove(2, 'たいあたり');
  const WATER_GUN = createTestMove(3, 'みずでっぽう', {
    type: 'みず',
    category: MoveCategory.Special,
  });
  const QUICK_ATTACK = createTestMove(4, 'でんこうせっか', { priority: 1 });
  const EARTHQUAKE = createTestMove(5, 'じしん', { type: 'じめん' });
  const THUNDER_WAVE = createTestMove(6, 'でんじは', {
    type: 'でんき',
    category: MoveCategory.Status,
  });
  const FEINT = createTestMove(7, 'フェイント', { power: 30, priority: 2 });
  const HYPER_DRILL = createTestMove(8, 'ハイパードリル');
  const BIG_TACKLE = createTestMove(9, 'すてみタックル', { power: 300 });
  const HIGH_JUMP_KICK = createTestMove(10, 'とびひざげり', { type: 'かくとう', power: 130 });
  const DOUBLE_HIT = createTestMove(11, 'ダブルアタック', { power: 200 });

  const GUARDS: ReadonlyArray<readonly [number, string, number, ProtectionMoveConfig]> = [
    [20, 'テストのまもる', 4, { kind: 'protect' }],
    [21, 'テストのキングシールド', 4, { kind: 'kingsShield' }],
    [22, 'テストのニードルガード', 4, { kind: 'spikyShield' }],
    [23, 'テストのトーチカ', 4, { kind: 'banefulBunker' }],
    [24, 'テストのブロッキング', 4, { kind: 'obstruct' }],
    [25, 'テストのスレッドトラップ', 4, { kind: 'silkTrap' }],
    [26, 'テストのかえんのまもり', 4, { kind: 'burningBulwark' }],
    [27, 'テストのこらえる', 4, { kind: 'endure' }],
    [28, 'テストのワイドガード', 3, { side: 'wideGuard' }],
    [29, 'テストのファストガード', 3, { side: 'quickGuard' }],
    [30, 'テストのトリックガード', 3, { side: 'craftyShield' }],
    [31, 'テストのたたみがえし', 0, { side: 'matBlock' }],
  ];
  const guardMoves = GUARDS.map(([id, name, priority]) => guardMove(id, name, priority));
  const guardId = (name: string): number => GUARDS.find(([, n]) => n === name)![0];

  const moves = [
    SPLASH,
    TACKLE,
    WATER_GUN,
    QUICK_ATTACK,
    EARTHQUAKE,
    THUNDER_WAVE,
    FEINT,
    HYPER_DRILL,
    BIG_TACKLE,
    HIGH_JUMP_KICK,
    DOUBLE_HIT,
    ...guardMoves,
  ];

  const setup = (
    options: {
      attackerAbility?: string;
      guardVolatile?: VolatileState;
      turn?: number;
      attackerSpeed?: number;
      /** ポケモン 1 の技（ポケモンごとに技は 10 個まで） */
      attackerMoveIds?: readonly number[];
    } = {},
  ) =>
    createBattleEngine({
      moves,
      turn: options.turn,
      pokemon: [
        {
          id: 1,
          trainerId: 1,
          active: true,
          baseSpeed: options.attackerSpeed ?? 150,
          ability: options.attackerAbility,
          moveIds: options.attackerMoveIds ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        },
        {
          id: 2,
          trainerId: 2,
          active: true,
          volatileState: options.guardVolatile,
          moveIds: [1, ...guardMoves.map(move => move.id)],
        },
        // 控え（技の欄の ID がポケモン 2 の欄と重ならないよう、ID を離す）
        { id: 9, trainerId: 1, moveIds: [1] },
      ],
    });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
    for (const [, name, , protection] of GUARDS) {
      MoveRegistry.register(name, { protection });
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('まもる系の技を使う', () => {
    it('まもるを使うと、そのターンの相手の攻撃技を防ぐ', async () => {
      // Arrange
      const engine = setup();

      // Act
      const result = await engine.runTurn(
        { moveId: TACKLE.id },
        { moveId: guardId('テストのまもる') },
      );

      // Assert
      expect(engine.status(2).currentHp).toBe(160);
      expect(result.actions.map(action => action.result)).toEqual([
        'Used テストのまもる protected itself!',
        'Used たいあたり but it was blocked (まもる)',
      ]);
    });

    it('成功すると protectCount が 1 になり、ターンの終わりに protection が消える', async () => {
      // Arrange
      const engine = setup();

      // Act
      await engine.runTurn({ moveId: SPLASH.id }, { moveId: guardId('テストのまもる') });

      // Assert
      expect(engine.status(2).volatileState.protectCount).toBe(1);
      expect(engine.status(2).volatileState.protection).toBeUndefined();
    });

    it('続けて使うと 1/3 の確率で成功し、protectCount が 2 になる', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0.33);
      const engine = setup({ guardVolatile: { protectCount: 1 } });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: guardId('テストのまもる') });

      // Assert
      expect(engine.status(2).currentHp).toBe(160);
      expect(engine.status(2).volatileState.protectCount).toBe(2);
    });

    it('続けて使って失敗すると、protectCount が消え、相手の技を受ける', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0.34);
      const engine = setup({ guardVolatile: { protectCount: 1 } });

      // Act
      const result = await engine.runTurn(
        { moveId: TACKLE.id },
        { moveId: guardId('テストのまもる') },
      );

      // Assert
      expect(result.actions[0].result).toBe('Used テストのまもる but it failed');
      expect(engine.status(2).currentHp).toBe(124);
      expect(engine.status(2).volatileState.protectCount).toBeUndefined();
    });

    it('このターン最後に動くときは失敗する（相手が交代したとき）', async () => {
      // Arrange
      const engine = setup();

      // Act
      const result = await engine.runTurn(
        { switchPokemonId: 9 },
        { moveId: guardId('テストのまもる') },
      );

      // Assert
      expect(result.actions[1].result).toBe('Used テストのまもる but it failed');
      expect(engine.status(2).volatileState.protectCount).toBeUndefined();
    });

    it('ワイドガードは陣営に書き、protectCount も増やす。ターンの終わりに消える', async () => {
      // Arrange
      const engine = setup();

      // Act
      await engine.runTurn({ moveId: SPLASH.id }, { moveId: guardId('テストのワイドガード') });

      // Assert
      expect(getSideConditions(engine.battle().sideState, 2).wideGuard).toBeUndefined();
      expect(engine.status(2).volatileState.protectCount).toBe(1);
    });

    it('トリックガードは protectCount を消す', async () => {
      // Arrange
      const engine = setup({ guardVolatile: { protectCount: 1 } });

      // Act
      await engine.runTurn({ moveId: SPLASH.id }, { moveId: guardId('テストのトリックガード') });

      // Assert
      expect(engine.status(2).volatileState.protectCount).toBeUndefined();
    });

    it('たたみがえしは、出てから最初の行動でなければ失敗する', async () => {
      // Arrange
      const engine = setup({ turn: 2, guardVolatile: { switchedInTurn: 0 }, attackerSpeed: 50 });

      // Act
      const result = await engine.runTurn(
        { moveId: TACKLE.id },
        { moveId: guardId('テストのたたみがえし') },
      );

      // Assert
      expect(result.actions[0].result).toBe('Used テストのたたみがえし but it failed');
      expect(engine.status(2).currentHp).toBe(124);
    });
  });

  describe('防ぐ技と通す技', () => {
    it('まもるは変化技も防ぐ', async () => {
      // Arrange
      const engine = setup();

      // Act
      await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: guardId('テストのまもる') });

      // Assert
      expect(engine.status(2).statusCondition).toBe(StatusCondition.None);
    });

    it('キングシールドは攻撃技を防ぎ、変化技は通す', async () => {
      // Arrange
      const engine = setup();

      // Act
      await engine.runTurn(
        { moveId: THUNDER_WAVE.id },
        { moveId: guardId('テストのキングシールド') },
      );

      // Assert
      expect(engine.status(2).statusCondition).toBe(StatusCondition.Paralysis);
    });

    it('ファストガードは優先度 1 以上の技だけを防ぐ', async () => {
      // Arrange
      const quick = setup();
      const normal = setup();

      // Act
      await quick.runTurn(
        { moveId: QUICK_ATTACK.id },
        { moveId: guardId('テストのファストガード') },
      );
      await normal.runTurn({ moveId: TACKLE.id }, { moveId: guardId('テストのファストガード') });

      // Assert
      expect(quick.status(2).currentHp).toBe(160);
      expect(normal.status(2).currentHp).toBe(124);
    });

    it('ワイドガードは相手全体の技（じしん）だけを防ぐ', async () => {
      // Arrange
      const spread = setup();
      const single = setup();

      // Act
      await spread.runTurn({ moveId: EARTHQUAKE.id }, { moveId: guardId('テストのワイドガード') });
      await single.runTurn({ moveId: TACKLE.id }, { moveId: guardId('テストのワイドガード') });

      // Assert
      expect(spread.status(2).currentHp).toBe(160);
      expect(single.status(2).currentHp).toBe(124);
    });

    it('トリックガードは変化技だけを防ぐ', async () => {
      // Arrange
      const status = setup();
      const attack = setup();

      // Act
      await status.runTurn(
        { moveId: THUNDER_WAVE.id },
        { moveId: guardId('テストのトリックガード') },
      );
      await attack.runTurn({ moveId: TACKLE.id }, { moveId: guardId('テストのトリックガード') });

      // Assert
      expect(status.status(2).statusCondition).toBe(StatusCondition.None);
      expect(attack.status(2).currentHp).toBe(124);
    });

    it('たたみがえしは、出てから最初の行動なら攻撃技を防ぎ、変化技は通す', async () => {
      // Arrange
      // たたみがえしは優先度 0 なので、相手より先に動くよう相手を遅くする
      // 最初から場にいる（switchedInTurn: 0）ポケモンの 1 ターン目は、出てから最初の行動
      const firstAction = { turn: 1, guardVolatile: { switchedInTurn: 0 }, attackerSpeed: 50 };
      const attack = setup(firstAction);
      const status = setup(firstAction);

      // Act
      await attack.runTurn({ moveId: TACKLE.id }, { moveId: guardId('テストのたたみがえし') });
      await status.runTurn(
        { moveId: THUNDER_WAVE.id },
        { moveId: guardId('テストのたたみがえし') },
      );

      // Assert
      expect(attack.status(2).currentHp).toBe(160);
      expect(status.status(2).statusCondition).toBe(StatusCondition.Paralysis);
    });

    it('まもるで防げない技（ハイパードリル）は通るが、守りは残る', async () => {
      // Arrange
      const engine = setup();
      const patchVolatile = jest.spyOn(engine.battleRepository, 'patchVolatileState');

      // Act
      await engine.runTurn({ moveId: HYPER_DRILL.id }, { moveId: guardId('テストのまもる') });

      // Assert
      expect(engine.status(2).currentHp).toBeLessThan(160);
      expect(patchVolatile).not.toHaveBeenCalledWith(
        2,
        expect.objectContaining({ protection: null }),
      );
    });

    it('フェイントは守りを通り抜け、相手の守りを解く', async () => {
      // Arrange
      const engine = setup();

      // Act
      const result = await engine.runTurn(
        { moveId: FEINT.id },
        { moveId: guardId('テストのまもる') },
      );

      // Assert
      expect(engine.status(2).currentHp).toBeLessThan(160);
      expect(result.actions[1].result).toContain('broke through the protection!');
    });

    it('フェイントで守りを解くと、相手の protection と protectCount が消える', async () => {
      // Arrange
      const engine = setup();
      const patchVolatile = jest.spyOn(engine.battleRepository, 'patchVolatileState');

      // Act
      await engine.runTurn({ moveId: FEINT.id }, { moveId: guardId('テストのまもる') });

      // Assert
      expect(patchVolatile).toHaveBeenCalledWith(2, { protection: null, protectCount: null });
      expect(engine.status(2).volatileState.protection).toBeUndefined();
      expect(engine.status(2).volatileState.protectCount).toBeUndefined();
    });

    it('フェイントは相手の陣営の守り（ワイドガード）も解き、protectCount を消す', async () => {
      // Arrange
      const engine = setup();
      const patchSide = jest.spyOn(engine.battleRepository, 'patchSideConditions');

      // Act
      const result = await engine.runTurn(
        { moveId: FEINT.id },
        { moveId: guardId('テストのワイドガード') },
      );

      // Assert
      expect(result.actions[1].result).toContain('broke through the protection!');
      expect(patchSide).toHaveBeenCalledWith(
        1,
        2,
        expect.objectContaining({ wideGuard: null, quickGuard: null }),
      );
      expect(getSideConditions(engine.battle().sideState, 2).wideGuard).toBeUndefined();
      expect(engine.status(2).volatileState.protectCount).toBeUndefined();
    });

    it('ファストガードは、いたずらごころで優先度が上がった変化技も防ぐ', async () => {
      // Arrange
      const engine = setup({ attackerAbility: 'いたずらごころ' });

      // Act
      const result = await engine.runTurn(
        { moveId: THUNDER_WAVE.id },
        { moveId: guardId('テストのファストガード') },
      );

      // Assert
      expect(engine.status(2).statusCondition).toBe(StatusCondition.None);
      expect(result.actions[1].result).toBe('Used でんじは but it was blocked (ファストガード)');
    });

    it('使用者の特性の bypassesProtection（ふかしのこぶし）が true なら守りを通り抜ける', async () => {
      // Arrange
      AbilityRegistry.register('テストのふかしのこぶし', {
        bypassesProtection: (_holder, ctx) => (ctx ? isContactMove(ctx) : false),
      });
      const contact = setup({ attackerAbility: 'テストのふかしのこぶし' });
      const special = setup({ attackerAbility: 'テストのふかしのこぶし' });

      // Act
      await contact.runTurn({ moveId: TACKLE.id }, { moveId: guardId('テストのまもる') });
      await special.runTurn({ moveId: WATER_GUN.id }, { moveId: guardId('テストのまもる') });

      // Assert
      expect(contact.status(2).currentHp).toBe(124);
      expect(special.status(2).currentHp).toBe(160);
    });
  });

  describe('接触した相手への効果', () => {
    it.each([
      ['テストのキングシールド', 'attackRank', -1],
      ['テストのブロッキング', 'defenseRank', -2],
      ['テストのスレッドトラップ', 'speedRank', -1],
    ] as const)('%s は、接触した相手の %s を %i する', async (guard, rank, expected) => {
      // Arrange
      const engine = setup();

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: guardId(guard) });

      // Assert
      expect(engine.status(1)[rank]).toBe(expected);
    });

    it('キングシールドは、接触しない技を防いでも能力を下げない', async () => {
      // Arrange
      const engine = setup();

      // Act
      await engine.runTurn({ moveId: WATER_GUN.id }, { moveId: guardId('テストのキングシールド') });

      // Assert
      expect(engine.status(2).currentHp).toBe(160);
      expect(engine.status(1).attackRank).toBe(0);
    });

    it('ニードルガードは、接触した相手に最大 HP の 1/8 のダメージを与える', async () => {
      // Arrange
      const engine = setup();

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: guardId('テストのニードルガード') });

      // Assert
      expect(engine.status(1).currentHp).toBe(140);
    });

    it.each([
      ['テストのトーチカ', StatusCondition.Poison],
      ['テストのかえんのまもり', StatusCondition.Burn],
    ])('%s は、接触した相手を %s にする', async (guard, status) => {
      // Arrange
      const engine = setup();

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: guardId(guard) });

      // Assert
      expect(engine.status(1).statusCondition).toBe(status);
    });
  });

  describe('こらえる', () => {
    it('こらえるを使ったターンは、ひんしになるダメージを受けても HP が 1 残る', async () => {
      // Arrange
      const engine = setup();

      // Act
      const result = await engine.runTurn(
        { moveId: BIG_TACKLE.id },
        { moveId: guardId('テストのこらえる') },
      );

      // Assert
      expect(engine.status(2).currentHp).toBe(1);
      expect(result.actions[1].result).toContain('endured the hit!');
    });

    it('連続技は、ヒットごとにこらえるで HP が 1 残る', async () => {
      // Arrange
      const engine = setup({ attackerMoveIds: [DOUBLE_HIT.id] });

      // Act
      const result = await engine.runTurn(
        { moveId: DOUBLE_HIT.id },
        { moveId: guardId('テストのこらえる') },
      );

      // Assert
      expect(engine.status(2).currentHp).toBe(1);
      expect(result.actions[1].result).toContain('endured the hit!');
    });
  });

  describe('外したときに自分がダメージを受ける技（とびひざげり）', () => {
    it.each(['テストのまもる', 'テストのキングシールド'])(
      '%s に防がれると、使用者は最大 HP の半分のダメージを受ける',
      async guard => {
        // Arrange
        const engine = setup();

        // Act
        const result = await engine.runTurn(
          { moveId: HIGH_JUMP_KICK.id },
          { moveId: guardId(guard) },
        );

        // Assert
        expect(engine.status(1).currentHp).toBe(80);
        expect(engine.status(2).currentHp).toBe(160);
        expect(result.actions[1].result).toContain('but it was blocked');
        expect(result.actions[1].result).toContain('kept going and crashed! (80 damage)');
      },
    );

    it('防がれなければ、使用者はダメージを受けない', async () => {
      // Arrange
      const engine = setup();

      // Act
      await engine.runTurn({ moveId: HIGH_JUMP_KICK.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).currentHp).toBe(160);
      expect(engine.status(2).currentHp).toBeLessThan(160);
    });
  });
});
