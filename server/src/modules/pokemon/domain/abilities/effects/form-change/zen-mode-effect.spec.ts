import { ZenModeEffect } from './zen-mode-effect';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('ZenModeEffect（ダルマモード）', () => {
  const DARMANITAN = 555;
  const effect = new ZenModeEffect();

  it('ターン終了時に HP が半分以下なら、ダルマモードになる', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      nationalDex: DARMANITAN,
      status: { currentHp: 50, maxHp: 100 },
    });

    // Act
    await effect.onTurnEnd(get(1), context());

    // Assert
    expect(get(1).volatileState.form).toBe('zen');
  });

  it('ターン終了時に HP が半分より上なら、ダルマモードにならない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      nationalDex: DARMANITAN,
      status: { currentHp: 51, maxHp: 100 },
    });

    // Act
    await effect.onTurnEnd(get(1), context());

    // Assert
    expect(get(1).volatileState.form).toBeUndefined();
  });

  it('ダルマモードで HP が半分より上に戻ったら、ノーマルモードに戻る', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      nationalDex: DARMANITAN,
      status: { currentHp: 51, maxHp: 100, volatileState: { form: 'zen' } },
    });

    // Act
    await effect.onTurnEnd(get(1), context());

    // Assert
    expect(get(1).volatileState.form).toBeUndefined();
  });

  it('最大 HP が奇数なら、半分を切り捨てずに比べる（101 のうち 50 で変わり、51 で変わらない）', async () => {
    // Arrange
    const low = createInMemoryBattle({
      nationalDex: DARMANITAN,
      status: { currentHp: 50, maxHp: 101 },
    });
    const high = createInMemoryBattle({
      nationalDex: DARMANITAN,
      status: { currentHp: 51, maxHp: 101 },
    });

    // Act
    await effect.onTurnEnd(low.get(1), low.context());
    await effect.onTurnEnd(high.get(1), high.context());

    // Assert
    expect(low.get(1).volatileState.form).toBe('zen');
    expect(high.get(1).volatileState.form).toBeUndefined();
  });

  it('ヒヒダルマでなければ、フォルムは変わらない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      nationalDex: 25,
      status: { currentHp: 10, maxHp: 100 },
    });

    // Act
    await effect.onTurnEnd(get(1), context());

    // Assert
    expect(get(1).volatileState.form).toBeUndefined();
  });

  it('へんしん中は、フォルムは変わらない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      nationalDex: DARMANITAN,
      status: { currentHp: 10, maxHp: 100, volatileState: { transformedIntoStatusId: 2 } },
    });

    // Act
    await effect.onTurnEnd(get(1), context());

    // Assert
    expect(get(1).volatileState.form).toBeUndefined();
  });
});
