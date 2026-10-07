import { PowerConstructEffect } from './power-construct-effect';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('PowerConstructEffect（スワームチェンジ）', () => {
  const ZYGARDE = 718;

  describe('onTurnEnd', () => {
    it('HPが半分以下なら、パーフェクトフォルムになり、最大HPが増えて減ったHPは保たれる', async () => {
      // Arrange: 50%フォルムの最大HPは 183、パーフェクトフォルムは 291（レベル50・個体値31・努力値0）
      const { context, get } = createInMemoryBattle(
        {
          ability: 'スワームチェンジ',
          nationalDex: ZYGARDE,
          status: { currentHp: 91, maxHp: 183 },
        },
        {},
      );

      // Act
      await new PowerConstructEffect().onTurnEnd(get(1), context());

      // Assert
      expect(get(1).persistentState.form).toBe('complete');
      expect(get(1).maxHp).toBe(291);
      expect(get(1).currentHp).toBe(199);
    });

    it('HPが半分より多ければ、フォルムを変えない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {
          ability: 'スワームチェンジ',
          nationalDex: ZYGARDE,
          status: { currentHp: 92, maxHp: 183 },
        },
        {},
      );

      // Act
      await new PowerConstructEffect().onTurnEnd(get(1), context());

      // Assert
      expect(get(1).persistentState.form).toBeUndefined();
      expect(get(1).maxHp).toBe(183);
    });

    it('ジガルデでなければ、フォルムを変えない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'スワームチェンジ', nationalDex: 25, status: { currentHp: 10, maxHp: 100 } },
        {},
      );

      // Act
      await new PowerConstructEffect().onTurnEnd(get(1), context());

      // Assert
      expect(get(1).persistentState.form).toBeUndefined();
    });

    it('すでにパーフェクトフォルムなら、何もしない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {
          ability: 'スワームチェンジ',
          nationalDex: ZYGARDE,
          status: { currentHp: 100, maxHp: 291, persistentState: { form: 'complete' } },
        },
        {},
      );

      // Act
      await new PowerConstructEffect().onTurnEnd(get(1), context());

      // Assert
      expect(get(1).maxHp).toBe(291);
      expect(get(1).currentHp).toBe(100);
    });
  });
});
