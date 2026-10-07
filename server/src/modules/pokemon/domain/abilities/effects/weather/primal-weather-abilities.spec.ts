import { Weather } from '@/modules/battle/domain/entities/battle.entity';
import { getGlobalFieldState } from '@/modules/battle/domain/state/side-state';
import { AbilityRegistry } from '../../ability-registry';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { setPrimalWeather } from '../../../battle-events/field-state';
import { PrimordialSeaEffect } from './primordial-sea-effect';
import { DesolateLandEffect } from './desolate-land-effect';
import { DeltaStreamEffect } from './delta-stream-effect';

describe('ゲンシ天候の特性（はじまりのうみ・おわりのだいち・デルタストリーム）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  const cases = [
    ['はじまりのうみ', () => new PrimordialSeaEffect(), 'heavyRain', Weather.Rain],
    ['おわりのだいち', () => new DesolateLandEffect(), 'harshSunlight', Weather.Sun],
    ['デルタストリーム', () => new DeltaStreamEffect(), 'strongWinds', Weather.None],
  ] as const;

  it.each(cases)('%s は primalWeather を持つ', (_name, create, kind) => {
    // Act
    const effect = create();

    // Assert
    expect(effect.primalWeather).toBe(kind);
  });

  it.each(cases)(
    '%s は場に出たとき、ふつうの天候を上書きしてゲンシ天候を出す',
    async (_name, create, kind, weather) => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      await battleRepository.update(1, { weather: Weather.Sandstorm });
      await battleRepository.patchGlobalFieldState(1, { weatherTurns: 3 });

      // Act
      await create().onEntry(get(1), context());

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(battle.weather).toBe(weather);
      expect(getGlobalFieldState(battle.sideState)).toEqual({
        primalWeather: kind,
        weatherSourceStatusId: 1,
      });
    },
  );

  it.each(cases)(
    '%s は場に出たとき、相手の別のゲンシ天候を上書きする',
    async (_name, create, kind, weather) => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      const other = kind === 'heavyRain' ? 'harshSunlight' : 'heavyRain';
      await setPrimalWeather(context(), get(2), other);

      // Act
      await create().onEntry(get(1), context());

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(battle.weather).toBe(weather);
      expect(getGlobalFieldState(battle.sideState).primalWeather).toBe(kind);
      expect(getGlobalFieldState(battle.sideState).weatherSourceStatusId).toBe(1);
    },
  );

  it.each(cases)(
    '%s は同じゲンシ天候がすでにあれば、出したポケモンを書き換えない',
    async (_name, create, kind) => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      await setPrimalWeather(context(), get(2), kind);

      // Act
      await create().onEntry(get(1), context());

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(getGlobalFieldState(battle.sideState).weatherSourceStatusId).toBe(2);
    },
  );

  it.each(cases)('%s がレジストリに登録されている', (name, create) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(create().constructor);
  });
});
