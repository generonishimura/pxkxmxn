import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { TeleportEffect } from './teleport-effect';

describe('TeleportEffect（テレポート）', () => {
  const addBench = (statuses: Map<number, BattlePokemonStatus>, currentHp = 100): void => {
    statuses.set(
      3,
      new BattlePokemonStatus(3, 1, 3, 1, false, currentHp, 100, 0, 0, 0, 0, 0, 0, 0, null),
    );
  };

  it('使用者と交代する（selfSwitch が true）', () => {
    // Arrange
    const effect = new TeleportEffect();

    // Act
    const selfSwitch = effect.selfSwitch;

    // Assert
    expect(selfSwitch).toBe(true);
  });

  it('控えがいれば成功する', async () => {
    // Arrange
    const { statuses, context, get } = createInMemoryBattle();
    addBench(statuses);

    // Act
    const message = await new TeleportEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBeNull();
  });

  it('控えがいなければ失敗する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();

    // Act
    const message = await new TeleportEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
  });

  it('控えがひんしだけなら失敗する', async () => {
    // Arrange
    const { statuses, context, get } = createInMemoryBattle();
    addBench(statuses, 0);

    // Act
    const message = await new TeleportEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
  });
});
