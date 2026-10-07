import { Field, Weather } from '../../domain/entities/battle.entity';
import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { setTypes } from '@/modules/pokemon/domain/battle-events/type-change';
import { changeForm } from '@/modules/pokemon/domain/battle-events/form-change';
import { setTerrain, setWeather } from '@/modules/pokemon/domain/battle-events/field-state';
import { applyIndirectDamage } from '@/modules/pokemon/domain/battle-events/indirect-damage';
import { fractionOfMaxHp } from '@/modules/pokemon/domain/battle-events/heal';
import {
  HarnessPokemon,
  createBattleEngine,
  createTestMove,
} from '../__tests__/battle-engine-harness';

/**
 * 技を出す直前（onPrepareHit）・ヒットを防ぐ（blockDamagingHit）・天候とフィールドの変化（onWeatherChange・onTerrainChange）の
 * 特性のフック（エンジン全体）。威力 50 の物理技は、実数値 120 どうしでタイプ一致なしなら 24 ダメージ
 */
describe('ExecuteTurnUseCase - タイプ・フォルムを変える特性のフック', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const TACKLE = createTestMove(2, 'たいあたり');
  const EMBER = createTestMove(3, 'ひのこ', { type: 'ほのお' });
  const METRONOME = createTestMove(4, 'ゆびをふる', { category: MoveCategory.Status });
  const DOUBLE_HIT = createTestMove(5, 'テストのにれんげき');
  const RAIN_DANCE = createTestMove(6, 'あまごい', { category: MoveCategory.Status, type: 'みず' });
  const TERRAIN = createTestMove(7, 'エレキフィールド', {
    category: MoveCategory.Status,
    type: 'でんき',
  });
  const DEFOG = createTestMove(8, 'きりばらい', { category: MoveCategory.Status, type: 'ひこう' });
  const MOVES = [SPLASH, TACKLE, EMBER, METRONOME, DOUBLE_HIT, RAIN_DANCE, TERRAIN, DEFOG];
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
        { id: 2, trainerId: 2, active: true, moveIds: ALL_MOVES, baseSpeed: 50, ...defender },
      ],
    });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
  });

  describe('onPrepareHit', () => {
    it('技を出す直前に呼ばれ、変えたタイプがその技のタイプ一致に使われる（へんげんじざい）', async () => {
      // Arrange
      AbilityRegistry.register('テストのへんげんじざい', {
        onPrepareHit: async (holder, _target, ctx) =>
          ctx?.moveTypeName && (await setTypes(holder, [ctx.moveTypeName], ctx))
            ? `changed its type to ${ctx.moveTypeName}!`
            : null,
      });
      const engine = setup({ ability: 'テストのへんげんじざい' });

      // Act
      const result = await engine.runTurn({ moveId: EMBER.id }, { moveId: SPLASH.id });

      // Assert: ほのおタイプになり、タイプ一致で 36
      expect(engine.status(1).volatileState.typeOverride).toEqual(['ほのお']);
      expect(engine.status(2).currentHp).toBe(160 - 36);
      expect(result.actions[0].result).toBe(
        'changed its type to ほのお! Used ひのこ and dealt 36 damage',
      );
    });

    it('技を呼ぶ技（ゆびをふる）では呼ばず、呼ばれた技で呼ぶ', async () => {
      // Arrange
      const seen: Array<string | undefined> = [];
      AbilityRegistry.register('テストのへんげんじざい', {
        onPrepareHit: async (_holder, _target, ctx) => {
          seen.push(ctx?.moveName);
          return null;
        },
      });
      MoveRegistry.register('ゆびをふる', {
        onUse: async (_a, _d, ctx: BattleContext) =>
          ctx.callMove!({ moveName: 'ひのこ', calledBy: 'ゆびをふる' }),
      });
      const engine = setup({ ability: 'テストのへんげんじざい' });

      // Act
      await engine.runTurn({ moveId: METRONOME.id }, { moveId: SPLASH.id });

      // Assert
      expect(seen).toEqual(['ひのこ']);
    });

    it('フォルムを変えたら、その技のダメージに新しいフォルムの実数値を使う（バトルスイッチ）', async () => {
      // Arrange
      AbilityRegistry.register('テストのバトルスイッチ', {
        onPrepareHit: async (holder, _target, ctx) =>
          ctx && ctx.moveCategory !== 'Status' && (await changeForm(holder, 'blade', ctx))
            ? 'changed to Blade Forme!'
            : null,
      });
      const engine = setup({
        ability: 'テストのバトルスイッチ',
        nationalDex: 681,
        types: ['はがね', 'ゴースト'],
        baseStats: [60, 50, 140, 50, 140, 60],
      });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert: ブレードフォルムの攻撃 160 → 31 ダメージ（シールドフォルムなら 14）
      expect(engine.status(1).volatileState.form).toBe('blade');
      expect(engine.status(2).currentHp).toBe(160 - 31);
    });
  });

  describe('failsOnTryMove（技を出す前の失敗。本家の onTryMove）', () => {
    it('onTryMove で失敗する技（もえつきる）では、onPrepareHit が呼ばれず、タイプも変わらない', async () => {
      // Arrange
      const prepareHit = jest.fn().mockResolvedValue(null);
      AbilityRegistry.register('テストのへんげんじざい', { onPrepareHit: prepareHit });
      MoveRegistry.register('ひのこ', {
        failsOnTryMove: (_attacker, _defender, ctx) =>
          !(ctx.attackerTypeNames ?? []).includes('ほのお'),
      });
      const engine = setup({ ability: 'テストのへんげんじざい', types: ['みず'] });

      // Act
      const result = await engine.runTurn({ moveId: EMBER.id }, { moveId: SPLASH.id });

      // Assert
      expect(prepareHit).not.toHaveBeenCalled();
      expect(engine.status(1).volatileState.typeOverride).toBeUndefined();
      expect(engine.status(2).currentHp).toBe(160);
      expect(result.actions[0].result).toBe('Used ひのこ but it failed');
    });

    it('失敗しなければ、技はそのまま出る', async () => {
      // Arrange
      MoveRegistry.register('ひのこ', {
        failsOnTryMove: (_attacker, _defender, ctx) =>
          !(ctx.attackerTypeNames ?? []).includes('ほのお'),
      });
      const engine = setup({ types: ['ほのお'] });

      // Act
      await engine.runTurn({ moveId: EMBER.id }, { moveId: SPLASH.id });

      // Assert: タイプ一致で 36
      expect(engine.status(2).currentHp).toBe(160 - 36);
    });
  });

  describe('blockDamagingHit', () => {
    const DISGUISE = 'テストのばけのかわ';
    const registerDisguise = (onHit?: jest.Mock): void => {
      AbilityRegistry.register(DISGUISE, {
        blockDamagingHit: async (holder, _attacker, ctx) => {
          if (!ctx || holder.persistentState.disguiseBusted === true) {
            return null;
          }
          await ctx.battleRepository?.patchPersistentState(holder.id, { disguiseBusted: true });
          await applyIndirectDamage(holder, fractionOfMaxHp(holder, 8), ctx);
          return 'Its disguise was busted!';
        },
      });
      if (onHit) {
        MoveRegistry.register('たいあたり', { onHit });
      }
    };

    it('最初のヒットを 0 にし、特性のメッセージを出す', async () => {
      // Arrange
      registerDisguise();
      const engine = setup({}, { ability: DISGUISE });

      // Act
      const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert: ダメージは受けず、1/8（20）だけ減る
      expect(engine.status(2).currentHp).toBe(140);
      expect(engine.status(2).persistentState.disguiseBusted).toBe(true);
      expect(result.actions[0].result).toBe(
        'Used たいあたり and dealt 0 damage Its disguise was busted!',
      );
    });

    it('防いだヒットでも、技の追加効果（onHit）は起きる（本家と同じ）', async () => {
      // Arrange
      const onHit = jest.fn().mockResolvedValue(null);
      registerDisguise(onHit);
      const engine = setup({}, { ability: DISGUISE });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(onHit).toHaveBeenCalledTimes(1);
    });

    it('連続技は、防いだあとのヒットからダメージを受ける', async () => {
      // Arrange
      registerDisguise();
      MoveRegistry.register('テストのにれんげき', {
        beforeDamage: async (_a, _d, _m, ctx) => {
          ctx.multiHitCount = 2;
        },
      });
      const engine = setup({}, { ability: DISGUISE });

      // Act
      const result = await engine.runTurn({ moveId: DOUBLE_HIT.id }, { moveId: SPLASH.id });

      // Assert: 1 回目は防ぎ（1/8 の 20）、2 回目は 36（タイプ一致）
      expect(engine.status(2).currentHp).toBe(160 - 20 - 36);
      expect(result.actions[0].result).toContain('(hit 2 times)');
    });

    it('かたやぶりの技には効かない', async () => {
      // Arrange
      registerDisguise();
      const engine = setup({ ability: 'かたやぶり' }, { ability: DISGUISE });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(160 - 36);
      expect(engine.status(2).persistentState.disguiseBusted).toBeUndefined();
    });
  });

  describe('onWeatherChange / onTerrainChange', () => {
    it('技で天候が変わると、場のポケモンの特性の onWeatherChange が呼ばれる', async () => {
      // Arrange
      const weathers: Array<Weather | null | undefined> = [];
      AbilityRegistry.register('テストのてんきや', {
        onWeatherChange: async (_holder, ctx) => {
          weathers.push(ctx?.weather);
        },
      });
      MoveRegistry.register('あまごい', {
        onUse: async (_a, _d, ctx) =>
          (await setWeather(ctx, Weather.Rain)) ? 'It started to rain!' : 'But it failed',
      });
      const engine = setup({}, { ability: 'テストのてんきや' });

      // Act
      await engine.runTurn({ moveId: RAIN_DANCE.id }, { moveId: SPLASH.id });

      // Assert
      expect(weathers).toEqual([Weather.Rain]);
    });

    it('天候がターン終了時に終わったときも呼ばれる', async () => {
      // Arrange
      const weathers: Array<Weather | null | undefined> = [];
      AbilityRegistry.register('テストのてんきや', {
        onWeatherChange: async (_holder, ctx) => {
          weathers.push(ctx?.weather);
        },
      });
      const engine = setup(
        {},
        { ability: 'テストのてんきや' },
        { weather: Weather.Sun, weatherTurns: 1 },
      );

      // Act
      await engine.runTurn({ moveId: SPLASH.id }, { moveId: SPLASH.id });

      // Assert
      expect(weathers).toEqual([Weather.None]);
    });

    it('技でフィールドが変わると、場のポケモンの特性の onTerrainChange が呼ばれる', async () => {
      // Arrange
      const fields: Array<Field | null | undefined> = [];
      AbilityRegistry.register('テストのぎたい', {
        onTerrainChange: async (_holder, ctx) => {
          fields.push(ctx?.field);
        },
      });
      MoveRegistry.register('エレキフィールド', {
        onUse: async (_a, _d, ctx) =>
          (await setTerrain(ctx, Field.ElectricTerrain))
            ? 'An electric current ran across the battlefield!'
            : 'But it failed',
      });
      const engine = setup({ ability: 'テストのぎたい' });

      // Act
      await engine.runTurn({ moveId: TERRAIN.id }, { moveId: SPLASH.id });

      // Assert
      expect(fields).toEqual([Field.ElectricTerrain]);
    });

    it('きりばらいでフィールドが消えると、onTerrainChange が呼ばれる（ぎたいがもとのタイプに戻れる）', async () => {
      // Arrange
      const fields: Array<Field | null | undefined> = [];
      AbilityRegistry.register('テストのぎたい', {
        onTerrainChange: async (_holder, ctx) => {
          fields.push(ctx?.field);
        },
      });
      const engine = createBattleEngine({
        moves: MOVES,
        field: Field.ElectricTerrain,
        sideState: { global: { terrainTurns: 3 } },
        pokemon: [
          { id: 1, trainerId: 1, active: true, moveIds: ALL_MOVES },
          {
            id: 2,
            trainerId: 2,
            active: true,
            moveIds: ALL_MOVES,
            baseSpeed: 50,
            ability: 'テストのぎたい',
          },
        ],
      });

      // Act
      await engine.runTurn({ moveId: DEFOG.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.battle().field).toBe(Field.None);
      expect(engine.battle().sideState.global?.terrainTurns).toBeUndefined();
      expect(fields).toEqual([Field.None]);
    });
  });
});
