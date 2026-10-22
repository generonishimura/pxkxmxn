import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { getSideConditions } from '@/modules/battle/domain/state/side-state';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { RevivalBlessingEffect } from './revival-blessing-effect';

const benched = (id: number, trainerId: number, currentHp: number): BattlePokemonStatus =>
  new BattlePokemonStatus(id, 1, id, trainerId, false, currentHp, 100, 0, 0, 0, 0, 0, 0, 0, null);

describe('RevivalBlessingEffect（さいきのいのり）', () => {
  it('ひんしの手持ちがいれば、復活させるポケモンの選択を待つ', async () => {
    // Arrange
    const { context, get, battleRepository, statuses } = createInMemoryBattle();
    statuses.set(3, benched(3, 1, 0));

    // Act
    const message = await new RevivalBlessingEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(getSideConditions(battle.sideState, 1).pendingChoice).toEqual({
      reason: 'revivalBlessing',
    });
    expect(getSideConditions(battle.sideState, 2).pendingChoice).toBeUndefined();
    expect(message).toBeNull();
  });

  it('ひんしの手持ちがいなければ失敗する', async () => {
    // Arrange
    const { context, get, battleRepository, statuses } = createInMemoryBattle();
    statuses.set(3, benched(3, 1, 50));

    // Act
    const message = await new RevivalBlessingEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(getSideConditions(battle.sideState, 1).pendingChoice).toBeUndefined();
    expect(message).toBe('But it failed');
  });

  it('相手の手持ちのひんしは数えない', async () => {
    // Arrange
    const { context, get, battleRepository, statuses } = createInMemoryBattle();
    statuses.set(3, benched(3, 2, 0));

    // Act
    const message = await new RevivalBlessingEffect().onUse(get(1), get(2), context());

    // Assert
    expect(battleRepository.patchSideConditions).not.toHaveBeenCalled();
    expect(message).toBe('But it failed');
  });
});
