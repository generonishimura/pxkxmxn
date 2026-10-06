import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { NightmareEffect } from './nightmare-effect';

describe('NightmareEffect（あくむ）', () => {
  it('ねむっている相手をあくむ状態にする', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { status: { statusCondition: StatusCondition.Sleep } },
    );
    const effect = new NightmareEffect();

    // Act
    const message = await effect.onUse(get(1), get(2), context({ defender: get(2) }));

    // Assert
    expect(message).toBe('began having a nightmare!');
    expect(get(2).volatileState.nightmare).toBe(true);
  });

  it('ぜったいねむりの相手もあくむ状態にする', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { ability: 'ぜったいねむり' });
    const effect = new NightmareEffect();

    // Act
    const message = await effect.onUse(
      get(1),
      get(2),
      context({ defender: get(2), defenderEffectiveStatus: StatusCondition.Sleep }),
    );

    // Assert
    expect(message).toBe('began having a nightmare!');
    expect(get(2).volatileState.nightmare).toBe(true);
  });

  it('起きている相手には失敗する', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();
    const effect = new NightmareEffect();

    // Act
    const message = await effect.onUse(get(1), get(2), context({ defender: get(2) }));

    // Assert
    expect(message).toBe('But it failed');
    expect(battleRepository.patchVolatileState).not.toHaveBeenCalled();
  });

  it('すでにあくむ状態の相手には失敗する', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle(
      {},
      { status: { statusCondition: StatusCondition.Sleep, volatileState: { nightmare: true } } },
    );
    const effect = new NightmareEffect();

    // Act
    const message = await effect.onUse(get(1), get(2), context({ defender: get(2) }));

    // Assert
    expect(message).toBe('But it failed');
    expect(battleRepository.patchVolatileState).not.toHaveBeenCalled();
  });
});
