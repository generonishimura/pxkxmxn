import { ShieldsDownEffect } from './shields-down-effect';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('ShieldsDownEffect（リミットシールド）', () => {
  const MINIOR = 774;
  const effect = new ShieldsDownEffect();

  describe('フォルム', () => {
    it('場に出たときに HP が半分以下なら、コアのすがたになる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        nationalDex: MINIOR,
        status: { currentHp: 50, maxHp: 100 },
      });

      // Act
      await effect.onEntry(get(1), context());

      // Assert
      expect(get(1).volatileState.form).toBe('core');
    });

    it('場に出たときに HP が半分より上なら、りゅうせいのすがたのまま', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        nationalDex: MINIOR,
        status: { currentHp: 51, maxHp: 100 },
      });

      // Act
      await effect.onEntry(get(1), context());

      // Assert
      expect(get(1).volatileState.form).toBeUndefined();
    });

    it('ターン終了時に HP が半分以下なら、コアのすがたになる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        nationalDex: MINIOR,
        status: { currentHp: 40, maxHp: 100 },
      });

      // Act
      await effect.onTurnEnd(get(1), context());

      // Assert
      expect(get(1).volatileState.form).toBe('core');
    });

    it('コアのすがたで HP が半分より上に戻ったら、りゅうせいのすがたに戻る', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        nationalDex: MINIOR,
        status: { currentHp: 80, maxHp: 100, volatileState: { form: 'core' } },
      });

      // Act
      await effect.onTurnEnd(get(1), context());

      // Assert
      expect(get(1).volatileState.form).toBeUndefined();
    });

    it('メテノでなければ、フォルムは変わらない', async () => {
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
  });
});
