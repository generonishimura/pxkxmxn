import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { BatonPassEffect } from './baton-pass-effect';

describe('BatonPassEffect（バトンタッチ）', () => {
  const addBench = (statuses: Map<number, BattlePokemonStatus>): void => {
    statuses.set(
      3,
      new BattlePokemonStatus(3, 1, 3, 1, false, 100, 100, 0, 0, 0, 0, 0, 0, 0, null),
    );
  };

  it('能力ランクと一時的な状態を引き継いで交代する（selfSwitch が batonPass）', () => {
    // Arrange
    const effect = new BatonPassEffect();

    // Act
    const selfSwitch = effect.selfSwitch;

    // Assert
    expect(selfSwitch).toBe('batonPass');
  });

  it('控えがいれば成功する', async () => {
    // Arrange
    const { statuses, context, get } = createInMemoryBattle();
    addBench(statuses);

    // Act
    const message = await new BatonPassEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBeNull();
  });

  it('控えがいなければ失敗する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();

    // Act
    const message = await new BatonPassEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
  });
});
