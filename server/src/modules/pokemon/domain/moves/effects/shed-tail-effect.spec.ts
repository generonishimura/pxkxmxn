import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { ShedTailEffect } from './shed-tail-effect';

const addBench = (statuses: Map<number, BattlePokemonStatus>): void => {
  statuses.set(3, new BattlePokemonStatus(3, 1, 3, 1, false, 100, 100, 0, 0, 0, 0, 0, 0, 0, null));
};

describe('ShedTailEffect（しっぽきり）', () => {
  it('交代するときにみがわりを引き継ぐ（selfSwitch が shedTail）', () => {
    // Act
    const effect = new ShedTailEffect();

    // Assert
    expect(effect.selfSwitch).toBe('shedTail');
  });

  it('最大 HP の半分（切り上げ）を払い、最大 HP の 1/4（切り捨て）のみがわりを書く', async () => {
    // Arrange
    const { context, get, statuses } = createInMemoryBattle({
      status: { currentHp: 101, maxHp: 101 },
    });
    addBench(statuses);

    // Act
    const message = await new ShedTailEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('The user shed its tail to create a decoy!');
    expect(get(1).currentHp).toBe(50);
    expect(get(1).volatileState.substituteHp).toBe(25);
  });

  it('HP が最大 HP の半分（切り上げ）以下なら失敗し、HP は減らない', async () => {
    // Arrange
    const { context, get, statuses } = createInMemoryBattle({
      status: { currentHp: 51, maxHp: 101 },
    });
    addBench(statuses);

    // Act
    const message = await new ShedTailEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(1).currentHp).toBe(51);
    expect(get(1).volatileState.substituteHp).toBeUndefined();
  });

  it('すでにみがわりがあれば失敗する', async () => {
    // Arrange
    const { context, get, statuses } = createInMemoryBattle({
      status: { volatileState: { substituteHp: 10 } },
    });
    addBench(statuses);

    // Act
    const message = await new ShedTailEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(1).currentHp).toBe(100);
    expect(get(1).volatileState.substituteHp).toBe(10);
  });

  it('控えがいなければ失敗し、HP は減らない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();

    // Act
    const message = await new ShedTailEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(1).currentHp).toBe(100);
    expect(get(1).volatileState.substituteHp).toBeUndefined();
  });

  it('マジックガードでも HP を払う', async () => {
    // Arrange
    const { context, get, statuses } = createInMemoryBattle({ ability: 'マジックガード' });
    addBench(statuses);

    // Act
    await new ShedTailEffect().onUse(get(1), get(2), context());

    // Assert
    expect(get(1).currentHp).toBe(50);
    expect(get(1).volatileState.substituteHp).toBe(25);
  });
});
