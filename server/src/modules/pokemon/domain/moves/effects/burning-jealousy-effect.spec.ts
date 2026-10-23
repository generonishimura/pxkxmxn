import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { BurningJealousyEffect } from './burning-jealousy-effect';

describe('BurningJealousyEffect（しっとのほのお）', () => {
  it('このターンに能力ランクが上がった相手を、やけどにする', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { status: { volatileState: { statsRaisedTurn: 1 } } },
    );

    // Act
    const message = await new BurningJealousyEffect().onHit(get(1), get(2), context());

    // Assert
    expect(get(2).statusCondition).toBe(StatusCondition.Burn);
    expect(message).toBe('was burned!');
  });

  it('上がったのが前のターンなら、やけどにしない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { status: { volatileState: { statsRaisedTurn: 0 } } },
    );

    // Act
    const message = await new BurningJealousyEffect().onHit(get(1), get(2), context());

    // Assert
    expect(get(2).statusCondition).toBeNull();
    expect(message).toBeNull();
  });

  it('このターンに下がっただけの相手は、やけどにしない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { status: { volatileState: { statsLoweredTurn: 1 } } },
    );

    // Act
    await new BurningJealousyEffect().onHit(get(1), get(2), context());

    // Assert
    expect(get(2).statusCondition).toBeNull();
  });

  it('ほのおタイプの相手は、やけどにならない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { types: ['ほのお'], status: { volatileState: { statsRaisedTurn: 1 } } },
    );

    // Act
    await new BurningJealousyEffect().onHit(get(1), get(2), context());

    // Assert
    expect(get(2).statusCondition).toBeNull();
  });

  it('追加効果なので、りんぷんの相手には効かない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { status: { volatileState: { statsRaisedTurn: 1 } } },
    );

    // Act
    await new BurningJealousyEffect().onHit(
      get(1),
      get(2),
      context({ secondaryEffectsSuppressed: true }),
    );

    // Assert
    expect(get(2).statusCondition).toBeNull();
  });
});
