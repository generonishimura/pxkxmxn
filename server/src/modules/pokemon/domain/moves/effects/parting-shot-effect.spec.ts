import { AbilityRegistry } from '../../abilities/ability-registry';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { PartingShotEffect } from './parting-shot-effect';

describe('PartingShotEffect（すてゼリフ）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('使用者と交代する（selfSwitch が true）', () => {
    // Arrange
    const effect = new PartingShotEffect();

    // Act
    const selfSwitch = effect.selfSwitch;

    // Assert
    expect(selfSwitch).toBe(true);
  });

  it('相手の攻撃と特攻を 1 段階ずつ下げ、交代はやめない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();
    const ctx = context();

    // Act
    const message = await new PartingShotEffect().onUse(get(1), get(2), ctx);

    // Assert
    expect(get(2).attackRank).toBe(-1);
    expect(get(2).specialAttackRank).toBe(-1);
    expect(ctx.selfSwitchCancelled).toBeUndefined();
    expect(message).toBe('Attack fell! Special Attack fell!');
  });

  it('片方だけ下がったときも交代はやめない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { status: { attackRank: -6 } });
    const ctx = context();

    // Act
    await new PartingShotEffect().onUse(get(1), get(2), ctx);

    // Assert
    expect(get(2).attackRank).toBe(-6);
    expect(get(2).specialAttackRank).toBe(-1);
    expect(ctx.selfSwitchCancelled).toBeUndefined();
  });

  it('攻撃も特攻も下がらなければ交代をやめる', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { status: { attackRank: -6, specialAttackRank: -6 } },
    );
    const ctx = context();

    // Act
    await new PartingShotEffect().onUse(get(1), get(2), ctx);

    // Assert
    expect(ctx.selfSwitchCancelled).toBe(true);
  });

  it('クリアボディで防がれたら交代をやめる', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { ability: 'クリアボディ' });
    const ctx = context();

    // Act
    await new PartingShotEffect().onUse(get(1), get(2), ctx);

    // Assert
    expect(get(2).attackRank).toBe(0);
    expect(get(2).specialAttackRank).toBe(0);
    expect(ctx.selfSwitchCancelled).toBe(true);
  });

  it('ミラーアーマーで跳ね返されたときは交代する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { ability: 'ミラーアーマー' });
    const ctx = context();

    // Act
    await new PartingShotEffect().onUse(get(1), get(2), ctx);

    // Assert
    expect(get(1).attackRank).toBe(-1);
    expect(get(1).specialAttackRank).toBe(-1);
    expect(ctx.selfSwitchCancelled).toBeUndefined();
  });
});
