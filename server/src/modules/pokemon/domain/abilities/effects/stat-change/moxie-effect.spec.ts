import { MoxieEffect } from './moxie-effect';
import { AbilityRegistry } from '../../ability-registry';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('MoxieEffect（じしんかじょう）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('自分の技で相手をひんしにしたら、攻撃を1段階上げる', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'じしんかじょう' },
      { status: { currentHp: 0 } },
    );

    // Act
    const message = await new MoxieEffect().onKnockOut(get(1), get(2), context());

    // Assert
    expect(get(1).attackRank).toBe(1);
    expect(message).toBe('Attack rose!');
  });

  it('攻撃ランクが+6なら、ランクは変わらない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'じしんかじょう', status: { attackRank: 6 } },
      { status: { currentHp: 0 } },
    );

    // Act
    const message = await new MoxieEffect().onKnockOut(get(1), get(2), context());

    // Assert
    expect(get(1).attackRank).toBe(6);
    expect(message).toBeNull();
  });

  it('たんじゅんのように自分のランクの変化を変える特性の影響を受ける（applyStatChanges を通す）', async () => {
    // Arrange
    AbilityRegistry.register('テストじしんかじょう', {
      modifyIncomingStatChange: (_holder, change) => change.rankChange * 2,
    });
    const { context, get } = createInMemoryBattle(
      { ability: 'テストじしんかじょう' },
      { status: { currentHp: 0 } },
    );

    // Act
    await new MoxieEffect().onKnockOut(get(1), get(2), context());

    // Assert
    expect(get(1).attackRank).toBe(2);
  });
});
