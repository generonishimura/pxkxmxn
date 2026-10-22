import { getGlobalFieldState } from '@/modules/battle/domain/state/side-state';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { FairyLockEffect } from './fairy-lock-effect';

describe('FairyLockEffect（フェアリーロック）', () => {
  it('次のターンの終わりまで両方とも交代できなくする（fairyLockTurns を 2 にする）', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();

    // Act
    const message = await new FairyLockEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(getGlobalFieldState(battle.sideState).fairyLockTurns).toBe(2);
    expect(message).toBe('No one will be able to run away during the next turn!');
  });

  it('すでにフェアリーロックの間なら失敗し、残りターン数を変えない', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();
    await battleRepository.patchGlobalFieldState(1, { fairyLockTurns: 1 });

    // Act
    const message = await new FairyLockEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(getGlobalFieldState(battle.sideState).fairyLockTurns).toBe(1);
    expect(message).toBe('But it failed');
  });
});
