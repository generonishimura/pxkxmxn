import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { getSideConditions } from '@/modules/battle/domain/state/side-state';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { HealingWishEffect } from './healing-wish-effect';

describe('HealingWishEffect（いやしのねがい）', () => {
  it('自分がひんしになり、自分の陣営に healingWish を書く', async () => {
    // Arrange
    const { context, get, statuses, battleRepository } = createInMemoryBattle();
    statuses.set(
      3,
      new BattlePokemonStatus(3, 1, 3, 1, false, 100, 100, 0, 0, 0, 0, 0, 0, 0, null),
    );

    // Act
    const message = await new HealingWishEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(message).toBe('The user fainted! Its replacement will be healed!');
    expect(get(1).currentHp).toBe(0);
    expect(getSideConditions(battle.sideState, 1).healingWish).toBe('healingWish');
  });

  it('控えがいなければ失敗し、ひんしにならない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();

    // Act
    const message = await new HealingWishEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(1).currentHp).toBe(100);
  });
});
