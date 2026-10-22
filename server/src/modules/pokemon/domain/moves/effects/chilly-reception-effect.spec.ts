import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';
import { getGlobalFieldState } from '@/modules/battle/domain/state/side-state';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { ChillyReceptionEffect } from './chilly-reception-effect';

const addBench = (statuses: Map<number, BattlePokemonStatus>): void => {
  statuses.set(3, new BattlePokemonStatus(3, 1, 3, 1, false, 100, 100, 0, 0, 0, 0, 0, 0, 0, null));
};

describe('ChillyReceptionEffect（さむいギャグ）', () => {
  it('使ったあとに控えと交代する（selfSwitch が true）', () => {
    // Act
    const effect = new ChillyReceptionEffect();

    // Assert
    expect(effect.selfSwitch).toBe(true);
  });

  it('天候をあられ（ゆきの代わり）にして 5 ターン続ける', async () => {
    // Arrange
    const { context, get, statuses, battleRepository } = createInMemoryBattle();
    addBench(statuses);

    // Act
    const message = await new ChillyReceptionEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(message).toBe('It started to snow!');
    expect(battle.weather).toBe(Weather.Hail);
    expect(getGlobalFieldState(battle.sideState).weatherTurns).toBe(5);
  });

  it('控えがいなくても天候を変えれば成功する', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();

    // Act
    const message = await new ChillyReceptionEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(message).toBe('It started to snow!');
    expect(battle.weather).toBe(Weather.Hail);
  });

  it('すでにあられでも、控えがいれば失敗しない（交代はする）', async () => {
    // Arrange
    const { context, get, statuses, battleRepository } = createInMemoryBattle();
    addBench(statuses);
    await battleRepository.update(1, { weather: Weather.Hail });

    // Act
    const message = await new ChillyReceptionEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBeNull();
  });

  it('ゲンシ天候の間でも、控えがいれば失敗しない（天候は変えずに交代はする）', async () => {
    // Arrange
    const { context, get, statuses, battleRepository } = createInMemoryBattle();
    addBench(statuses);
    await battleRepository.update(1, { weather: Weather.Rain });
    await battleRepository.patchGlobalFieldState(1, { primalWeather: 'heavyRain' });

    // Act
    const message = await new ChillyReceptionEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(message).toBeNull();
    expect(battle.weather).toBe(Weather.Rain);
  });

  it('天候を変えられず控えもいなければ失敗する', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();
    await battleRepository.update(1, { weather: Weather.Hail });

    // Act
    const message = await new ChillyReceptionEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
  });
});
