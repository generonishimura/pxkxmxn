import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { getSideConditions } from '@/modules/battle/domain/state/side-state';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { LunarDanceEffect } from './lunar-dance-effect';

describe('LunarDanceEffect（みかづきのまい）', () => {
  it('自分がひんしになり、自分の陣営に healingWish: lunarDance を書く', async () => {
    // Arrange
    const { context, get, statuses, battleRepository } = createInMemoryBattle();
    statuses.set(
      3,
      new BattlePokemonStatus(3, 1, 3, 1, false, 100, 100, 0, 0, 0, 0, 0, 0, 0, null),
    );

    // Act
    const message = await new LunarDanceEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(message).toBe('The user fainted! Its replacement will be healed!');
    expect(get(1).currentHp).toBe(0);
    expect(getSideConditions(battle.sideState, 1).healingWish).toBe('lunarDance');
  });

  it('控えがいなければ失敗し、ひんしにならない', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();

    // Act
    const message = await new LunarDanceEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(message).toBe('But it failed');
    expect(get(1).currentHp).toBe(100);
    expect(getSideConditions(battle.sideState, 1).healingWish).toBeUndefined();
  });
});
