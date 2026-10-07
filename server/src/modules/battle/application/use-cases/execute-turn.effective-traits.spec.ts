import { Weather } from '../../domain/entities/battle.entity';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { tryInflictStatus } from '@/modules/pokemon/domain/battle-events/status-infliction';
import { moveEffectSource } from '@/modules/pokemon/domain/moves/effects/base/base-stat-change-effect';
import {
  HarnessPokemon,
  createBattleEngine,
  createTestMove,
} from '../__tests__/battle-engine-harness';

/**
 * タイプ・特性・フォルムの上書きが、エンジンのすべての読み取りで使われること（エンジン全体）
 * 実数値はすべて 120（種族値 100）、最大 HP は 160。威力 50 の物理技は、タイプ一致なしで 24 ダメージ
 */
describe('ExecuteTurnUseCase - 実効のタイプ・特性・フォルム', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const TACKLE = createTestMove(2, 'たいあたり');
  const EMBER = createTestMove(3, 'ひのこ', { type: 'ほのお' });
  const MUD = createTestMove(4, 'どろかけ', { type: 'じめん' });
  const BURN = createTestMove(5, 'テストのおにび', {
    category: MoveCategory.Status,
    type: 'ほのお',
  });
  const MOVES = [SPLASH, TACKLE, EMBER, MUD, BURN];
  const ALL_MOVES = MOVES.map(move => move.id);

  const setup = (
    attacker: Partial<HarnessPokemon> = {},
    defender: Partial<HarnessPokemon> = {},
    options: { weather?: Weather; weatherTurns?: number } = {},
  ) =>
    createBattleEngine({
      moves: MOVES,
      weather: options.weather,
      sideState:
        options.weatherTurns !== undefined
          ? { global: { weatherTurns: options.weatherTurns } }
          : {},
      pokemon: [
        { id: 1, trainerId: 1, active: true, moveIds: ALL_MOVES, ...attacker },
        { id: 3, trainerId: 1, moveIds: ALL_MOVES },
        { id: 2, trainerId: 2, active: true, moveIds: ALL_MOVES, baseSpeed: 50, ...defender },
      ],
    });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
    // ひのこの追加効果（10% のやけど）で、ターン終了時の HP が揺れないようにする
    MoveRegistry.register('ひのこ', {});
    AbilityRegistry.register('テストのふゆう', {
      isImmuneToType: (_pokemon, typeName) => typeName === 'じめん',
    });
  });

  describe('タイプ', () => {
    it('使用者の typeOverride がタイプ一致に使われる（もとのタイプでは一致しない）', async () => {
      // Arrange
      const engine = setup({ types: ['ノーマル'], volatileState: { typeOverride: ['ほのお'] } });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert: ノーマル技はタイプ一致にならず 24
      expect(engine.status(2).currentHp).toBe(160 - 24);
    });

    it('相手の typeOverride で、もとのタイプの相性 0 が消える', async () => {
      // Arrange
      const engine = setup(
        {},
        { types: ['ゴースト'], volatileState: { typeOverride: ['ノーマル'] } },
      );

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert: タイプ一致で 36
      expect(engine.status(2).currentHp).toBe(160 - 36);
    });

    it('はねやすめのターンは、ひこうタイプだけのポケモンにじめん技が当たる', async () => {
      // Arrange
      const engine = setup({}, { types: ['ひこう'], volatileState: { roosting: true } });

      // Act
      await engine.runTurn({ moveId: MUD.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(160 - 24);
    });

    it('3 つめのタイプ（ハロウィンのゴースト）にはノーマル技が効かない', async () => {
      // Arrange
      const engine = setup({}, { types: ['みず'], volatileState: { addedType: 'ゴースト' } });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(160);
    });

    it('typeOverride のいわタイプは、すなあらしのダメージを受けない', async () => {
      // Arrange
      const engine = setup(
        { volatileState: { typeOverride: ['いわ'] } },
        {},
        { weather: Weather.Sandstorm, weatherTurns: 3 },
      );

      // Act
      await engine.runTurn({ moveId: SPLASH.id }, { moveId: SPLASH.id });

      // Assert: 相手だけ 1/16 = 10
      expect(engine.status(1).currentHp).toBe(160);
      expect(engine.status(2).currentHp).toBe(150);
    });

    it('typeOverride のほのおタイプは、やけどにならない', async () => {
      // Arrange
      MoveRegistry.register('テストのおにび', {
        onUse: async (attacker, defender, ctx) => {
          const { inflicted } = await tryInflictStatus(defender, StatusCondition.Burn, ctx, {
            source: moveEffectSource(attacker, ctx),
          });
          return inflicted ? 'was burned!' : 'But it failed';
        },
      });
      const engine = setup({}, { volatileState: { typeOverride: ['ほのお'] } });

      // Act
      await engine.runTurn({ moveId: BURN.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).statusCondition).toBe(StatusCondition.None);
    });

    it('typeOverride のゴーストタイプは、逃げられない状態でも交代できる', async () => {
      // Arrange
      const engine = setup({ volatileState: { typeOverride: ['ゴースト'], trappedByStatusId: 2 } });

      // Act
      await engine.runTurn({ switchPokemonId: 3 }, { moveId: SPLASH.id });

      // Assert
      expect(engine.active(1)?.id).toBe(3);
    });

    it('交代しても残るフォルムのタイプで、ステルスロックのダメージが決まる', async () => {
      // Arrange
      const engine = createBattleEngine({
        moves: MOVES,
        sideState: { sides: { '1': { stealthRock: true } } },
        pokemon: [
          { id: 1, trainerId: 1, active: true, moveIds: ALL_MOVES },
          {
            id: 3,
            trainerId: 1,
            moveIds: ALL_MOVES,
            nationalDex: 351,
            persistentState: { form: 'sunny' },
          },
          { id: 2, trainerId: 2, active: true, moveIds: ALL_MOVES },
        ],
      });

      // Act
      await engine.runTurn({ switchPokemonId: 3 }, { moveId: SPLASH.id });

      // Assert: ほのおタイプにいわは 2 倍 → 160 × 2 / 8 = 40
      expect(engine.status(3).currentHp).toBe(120);
    });
  });

  describe('特性', () => {
    it('abilityOverride の特性で、技のタイプを無効にする', async () => {
      // Arrange
      const engine = setup({}, { volatileState: { abilityOverride: 'テストのふゆう' } });

      // Act
      await engine.runTurn({ moveId: MUD.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(160);
    });

    it('abilitySuppressed（いえき）の特性は効かない', async () => {
      // Arrange
      const engine = setup(
        {},
        { ability: 'テストのふゆう', volatileState: { abilitySuppressed: true } },
      );

      // Act
      await engine.runTurn({ moveId: MUD.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(160 - 24);
    });

    it('相手のかがくへんかガスで、特性が効かない', async () => {
      // Arrange
      const engine = setup({ ability: 'かがくへんかガス' }, { ability: 'テストのふゆう' });

      // Act
      await engine.runTurn({ moveId: MUD.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(160 - 24);
    });

    it('abilityOverride の特性の modifySpeed で、行動順が変わる', async () => {
      // Arrange
      AbilityRegistry.register('テストのはやあし', { modifySpeed: (_p, speed) => speed * 10 });
      const engine = setup({}, { volatileState: { abilityOverride: 'テストのはやあし' } });

      // Act
      const result = await engine.runTurn({ moveId: SPLASH.id }, { moveId: SPLASH.id });

      // Assert
      expect(result.actions[0].trainerId).toBe(2);
    });

    it('abilitySuppressed の特性は、ターン終了時に呼ばれない', async () => {
      // Arrange
      const onTurnEnd = jest.fn();
      AbilityRegistry.register('テストのターンエンド', { onTurnEnd });
      const engine = setup({
        ability: 'テストのターンエンド',
        volatileState: { abilitySuppressed: true },
      });

      // Act
      await engine.runTurn({ moveId: SPLASH.id }, { moveId: SPLASH.id });

      // Assert
      expect(onTurnEnd).not.toHaveBeenCalled();
    });
    it('ゲンシ天候を出したポケモンの特性が消されたら、ゲンシ天候が終わる', async () => {
      // Arrange
      AbilityRegistry.register('テストのおわりのだいち', { primalWeather: 'harshSunlight' });
      MoveRegistry.register('テストのいえき', {
        onUse: async (_attacker, defender, ctx) => {
          await ctx.battleRepository?.patchVolatileState(defender.id, { abilitySuppressed: true });
          return null;
        },
      });
      const GASTRO = createTestMove(6, 'テストのいえき', { category: MoveCategory.Status });
      const engine = createBattleEngine({
        moves: [...MOVES, GASTRO],
        weather: Weather.Sun,
        sideState: { global: { primalWeather: 'harshSunlight', weatherSourceStatusId: 1 } },
        pokemon: [
          {
            id: 1,
            trainerId: 1,
            active: true,
            moveIds: ALL_MOVES,
            ability: 'テストのおわりのだいち',
          },
          { id: 2, trainerId: 2, active: true, moveIds: [...ALL_MOVES, GASTRO.id] },
        ],
      });

      // Act
      await engine.runTurn({ moveId: SPLASH.id }, { moveId: GASTRO.id });

      // Assert
      expect(engine.battle().weather).toBe(Weather.None);
      expect(engine.battle().sideState.global?.primalWeather).toBeUndefined();
    });
  });

  describe('かがくへんかガスが交代で出たとき', () => {
    it('相手のゲンシ天候の特性が消え、交代のあとにゲンシ天候が終わる', async () => {
      // Arrange
      AbilityRegistry.register('テストのおわりのだいち', { primalWeather: 'harshSunlight' });
      const engine = createBattleEngine({
        moves: MOVES,
        weather: Weather.Sun,
        sideState: { global: { primalWeather: 'harshSunlight', weatherSourceStatusId: 1 } },
        pokemon: [
          {
            id: 1,
            trainerId: 1,
            active: true,
            moveIds: ALL_MOVES,
            ability: 'テストのおわりのだいち',
          },
          { id: 2, trainerId: 2, active: true, moveIds: ALL_MOVES, baseSpeed: 50 },
          { id: 4, trainerId: 2, moveIds: ALL_MOVES, ability: 'かがくへんかガス' },
        ],
      });

      // Act
      await engine.runTurn({ moveId: SPLASH.id }, { switchPokemonId: 4 });

      // Assert
      expect(engine.battle().weather).toBe(Weather.None);
      expect(engine.battle().sideState.global?.primalWeather).toBeUndefined();
    });
  });

  describe('フォルム', () => {
    it('volatileState.form の種族値で、ダメージが決まる（ブレードフォルム）', async () => {
      // Arrange
      const shield = setup({ nationalDex: 681, baseStats: [60, 50, 140, 50, 140, 60] });
      const blade = setup({
        nationalDex: 681,
        baseStats: [60, 50, 140, 50, 140, 60],
        volatileState: { form: 'blade' },
      });

      // Act
      await shield.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });
      await blade.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert: フォルムを書いていなければ既定のシールドフォルム（はがね・ゴースト。DB のノーマルは使わない）で、
      // 一致なしで攻撃 70 → 14 ダメージ。ブレードフォルムは一致なしで攻撃 160 → 31 ダメージ
      expect(shield.status(2).currentHp).toBe(160 - 14);
      expect(blade.status(2).currentHp).toBe(160 - 31);
    });

    it('フォルムの素早さで、行動順が変わる（メテノのコア）', async () => {
      // Arrange: DB の素早さは 60（りゅうせいのすがた）。コアの素早さは 120
      const engine = setup(
        {},
        {
          nationalDex: 774,
          baseStats: [60, 60, 100, 60, 100, 60],
          baseSpeed: undefined,
          volatileState: { form: 'core' },
        },
      );

      // Act
      const result = await engine.runTurn({ moveId: SPLASH.id }, { moveId: SPLASH.id });

      // Assert: 素早さ 140 の相手が先に動く
      expect(result.actions[0].trainerId).toBe(2);
    });
  });
});
