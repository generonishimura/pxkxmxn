import { ForecastEffect } from './forecast-effect';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';
import { AbilityRegistry } from '../../ability-registry';

describe('ForecastEffect（てんきや）', () => {
  const CASTFORM = 351;
  const effect = new ForecastEffect();

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    [Weather.Sun, 'sunny'],
    [Weather.Rain, 'rainy'],
    [Weather.Hail, 'snowy'],
  ])('天候が %s に変わったら、%s のすがたになる', async (weather, form) => {
    // Arrange
    const { context, get } = createInMemoryBattle({ nationalDex: CASTFORM });

    // Act
    await effect.onWeatherChange(get(1), context({ weather }));

    // Assert
    expect(get(1).volatileState.form).toBe(form);
  });

  it('場に出たときの天候でも、すがたが変わる', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ nationalDex: CASTFORM });

    // Act
    await effect.onEntry(get(1), context({ weather: Weather.Rain }));

    // Assert
    expect(get(1).volatileState.form).toBe('rainy');
  });

  it('場に出たとき、コンテキストに天候がなければバトルの天候を読む', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle({ nationalDex: CASTFORM });
    await battleRepository.update(1, { weather: Weather.Rain });

    // Act
    await effect.onEntry(get(1), context());

    // Assert
    expect(get(1).volatileState.form).toBe('rainy');
  });

  it.each(['ノーてんき', 'エアロック'])(
    '場に出たとき、相手の %s が場にいれば、雨でもすがたは変わらない',
    async ability => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle(
        { nationalDex: CASTFORM },
        { ability },
      );
      await battleRepository.update(1, { weather: Weather.Rain });

      // Act
      await effect.onEntry(get(1), context());

      // Assert
      expect(get(1).volatileState.form).toBeUndefined();
    },
  );

  it('場に出たとき、相手のノーてんきがひんしなら、雨のすがたになる', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle(
      { nationalDex: CASTFORM },
      { ability: 'ノーてんき', status: { currentHp: 0 } },
    );
    await battleRepository.update(1, { weather: Weather.Rain });

    // Act
    await effect.onEntry(get(1), context());

    // Assert
    expect(get(1).volatileState.form).toBe('rainy');
  });

  it('天候がなくなったら、もとのすがたに戻る', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      nationalDex: CASTFORM,
      status: { volatileState: { form: 'sunny' } },
    });

    // Act
    await effect.onWeatherChange(get(1), context({ weather: Weather.None }));

    // Assert
    expect(get(1).volatileState.form).toBeUndefined();
  });

  it('すなあらしでは、もとのすがたに戻る', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      nationalDex: CASTFORM,
      status: { volatileState: { form: 'rainy' } },
    });

    // Act
    await effect.onWeatherChange(get(1), context({ weather: Weather.Sandstorm }));

    // Assert
    expect(get(1).volatileState.form).toBeUndefined();
  });

  it('ポワルンでなければ、すがたは変わらない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ nationalDex: 25 });

    // Act
    await effect.onWeatherChange(get(1), context({ weather: Weather.Sun }));

    // Assert
    expect(get(1).volatileState.form).toBeUndefined();
  });

  it('へんしん中は、すがたは変わらない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      nationalDex: CASTFORM,
      status: { volatileState: { transformedIntoStatusId: 2 } },
    });

    // Act
    await effect.onWeatherChange(get(1), context({ weather: Weather.Sun }));

    // Assert
    expect(get(1).volatileState.form).toBeUndefined();
  });
});
