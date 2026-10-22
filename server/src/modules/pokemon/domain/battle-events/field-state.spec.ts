import { Field, Weather } from '@/modules/battle/domain/entities/battle.entity';
import { getGlobalFieldState } from '@/modules/battle/domain/state/side-state';
import { AbilityRegistry } from '../abilities/ability-registry';
import {
  addEntryHazard,
  clearSideConditions,
  setPrimalWeather,
  setTerrain,
  setWeather,
  swapSideConditions,
} from './field-state';
import { HAZARD_KEYS, getSideConditions } from '@/modules/battle/domain/state/side-state';
import { createInMemoryBattle } from './__tests__/in-memory-battle';

describe('天候・フィールドを出す', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('setWeather', () => {
    it('天候を変え、残りターン数 5 を書く', async () => {
      // Arrange
      const { context, battleRepository } = createInMemoryBattle();

      // Act
      const changed = await setWeather(context(), Weather.Sandstorm);

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(changed).toBe(true);
      expect(battle.weather).toBe(Weather.Sandstorm);
      expect(getGlobalFieldState(battle.sideState).weatherTurns).toBe(5);
    });

    it('すでに同じ天候なら何もしない', async () => {
      // Arrange
      const { context, battleRepository } = createInMemoryBattle();
      await battleRepository.update(1, { weather: Weather.Rain });
      await battleRepository.patchGlobalFieldState(1, { weatherTurns: 2 });

      // Act
      const changed = await setWeather(context(), Weather.Rain);

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(changed).toBe(false);
      expect(getGlobalFieldState(battle.sideState).weatherTurns).toBe(2);
    });

    it('ゲンシ天候の間は、ふつうの天候に変えられない', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      await setPrimalWeather(context(), get(2), 'heavyRain');

      // Act
      const changed = await setWeather(context(), Weather.Sun);

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(changed).toBe(false);
      expect(battle.weather).toBe(Weather.Rain);
    });
  });

  describe('setPrimalWeather', () => {
    it.each([
      ['heavyRain', Weather.Rain],
      ['harshSunlight', Weather.Sun],
      ['strongWinds', Weather.None],
    ] as const)(
      '%s では Battle.weather を %s にし、出したポケモンを書く',
      async (kind, weather) => {
        // Arrange
        const { context, get, battleRepository } = createInMemoryBattle();
        await battleRepository.patchGlobalFieldState(1, { weatherTurns: 3 });

        // Act
        const changed = await setPrimalWeather(context(), get(1), kind);

        // Assert
        const battle = (await battleRepository.findById(1))!;
        expect(changed).toBe(true);
        expect(battle.weather).toBe(weather);
        expect(getGlobalFieldState(battle.sideState)).toEqual({
          primalWeather: kind,
          weatherSourceStatusId: 1,
        });
      },
    );

    it('ゲンシ天候は、別のゲンシ天候で上書きできる', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      await setPrimalWeather(context(), get(1), 'heavyRain');

      // Act
      const changed = await setPrimalWeather(context(), get(2), 'harshSunlight');

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(changed).toBe(true);
      expect(battle.weather).toBe(Weather.Sun);
      expect(getGlobalFieldState(battle.sideState).weatherSourceStatusId).toBe(2);
    });

    it('同じゲンシ天候なら何もしない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();
      await setPrimalWeather(context(), get(1), 'strongWinds');

      // Act
      const changed = await setPrimalWeather(context(), get(2), 'strongWinds');

      // Assert
      expect(changed).toBe(false);
    });
  });

  describe('setTerrain', () => {
    it('フィールドを変え、残りターン数 5 を書く', async () => {
      // Arrange
      const { context, battleRepository } = createInMemoryBattle();

      // Act
      const changed = await setTerrain(context(), Field.GrassyTerrain);

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(changed).toBe(true);
      expect(battle.field).toBe(Field.GrassyTerrain);
      expect(getGlobalFieldState(battle.sideState).terrainTurns).toBe(5);
    });

    it('すでに同じフィールドなら何もしない', async () => {
      // Arrange
      const { context, battleRepository } = createInMemoryBattle();
      await battleRepository.update(1, { field: Field.MistyTerrain });

      // Act
      const changed = await setTerrain(context(), Field.MistyTerrain);

      // Assert
      expect(changed).toBe(false);
    });
  });

  describe('addEntryHazard', () => {
    it('まきびしは 3 層まで重ね、4 回目は失敗する', async () => {
      // Arrange
      const { context, battleRepository } = createInMemoryBattle();

      // Act
      const results = [];
      for (let i = 0; i < 4; i++) {
        results.push(await addEntryHazard(context(), 2, 'spikes'));
      }

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(results).toEqual([true, true, true, false]);
      expect(getSideConditions(battle.sideState, 2).spikesLayers).toBe(3);
    });

    it('どくびしは 2 層まで重ねる', async () => {
      // Arrange
      const { context, battleRepository } = createInMemoryBattle();

      // Act
      const results = [];
      for (let i = 0; i < 3; i++) {
        results.push(await addEntryHazard(context(), 2, 'toxicSpikes'));
      }

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(results).toEqual([true, true, false]);
      expect(getSideConditions(battle.sideState, 2).toxicSpikesLayers).toBe(2);
    });

    it('ステルスロックは 1 つだけ置ける', async () => {
      // Arrange
      const { context } = createInMemoryBattle();

      // Act
      const first = await addEntryHazard(context(), 2, 'stealthRock');
      const second = await addEntryHazard(context(), 2, 'stealthRock');

      // Assert
      expect([first, second]).toEqual([true, false]);
    });
  });

  describe('clearSideConditions', () => {
    it('指定したキーのうち、あったものだけを消して返す', async () => {
      // Arrange
      const { context, battleRepository } = createInMemoryBattle();
      await battleRepository.patchSideConditions(1, 1, {
        spikesLayers: 2,
        stickyWeb: true,
        reflectTurns: 3,
      });

      // Act
      const removed = await clearSideConditions(context(), 1, HAZARD_KEYS);

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(removed).toEqual(['spikesLayers', 'stickyWeb']);
      expect(getSideConditions(battle.sideState, 1)).toEqual({ reflectTurns: 3 });
    });
  });

  describe('swapSideConditions', () => {
    it('壁・設置技を入れ替え、ねがいごとは元の陣営に残す', async () => {
      // Arrange
      const { context, battleRepository } = createInMemoryBattle();
      await battleRepository.patchSideConditions(1, 1, {
        reflectTurns: 3,
        wish: { turns: 1, healAmount: 50 },
      });
      await battleRepository.patchSideConditions(1, 2, { stealthRock: true, tailwindTurns: 2 });

      // Act
      await swapSideConditions(context());

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(getSideConditions(battle.sideState, 1)).toEqual({
        wish: { turns: 1, healAmount: 50 },
        stealthRock: true,
        tailwindTurns: 2,
      });
      expect(getSideConditions(battle.sideState, 2)).toEqual({ reflectTurns: 3 });
    });
  });
});
