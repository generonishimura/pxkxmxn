import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { CurseEffect } from './curse-effect';

describe('CurseEffect（のろい）', () => {
  describe('ゴーストタイプ以外が使ったとき', () => {
    it('自分の攻撃・防御を 1 段階上げ、素早さを 1 段階下げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ types: ['ノーマル'] });
      const effect = new CurseEffect();

      // Act
      await effect.onUse(get(1), get(2), context());

      // Assert
      expect(get(1).attackRank).toBe(1);
      expect(get(1).defenseRank).toBe(1);
      expect(get(1).speedRank).toBe(-1);
      expect(get(1).currentHp).toBe(100);
      expect(get(2).volatileState.cursed).toBeUndefined();
    });
  });

  describe('ゴーストタイプが使ったとき', () => {
    it('最大 HP の 1/2（切り捨て）を払い、相手をのろい状態にする', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        types: ['どく', 'ゴースト'],
        status: { currentHp: 101, maxHp: 101 },
      });
      const effect = new CurseEffect();

      // Act
      const message = await effect.onUse(get(1), get(2), context());

      // Assert
      expect(message).toBe('cut its own HP and laid a curse on the target!');
      expect(get(1).currentHp).toBe(51);
      expect(get(2).volatileState.cursed).toBe(true);
      expect(get(1).attackRank).toBe(0);
    });

    it('残り HP が最大 HP の 1/2 以下なら、のろいをかけて自分はひんしになる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        types: ['ゴースト'],
        status: { currentHp: 40, maxHp: 100 },
      });
      const effect = new CurseEffect();

      // Act
      await effect.onUse(get(1), get(2), context());

      // Assert
      expect(get(1).currentHp).toBe(0);
      expect(get(2).volatileState.cursed).toBe(true);
    });

    it('最大 HP が 1 なら 1 を払い、ひんしになる（本家の directDamage は最低 1）', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        types: ['むし', 'ゴースト'],
        status: { currentHp: 1, maxHp: 1 },
      });
      const effect = new CurseEffect();

      // Act
      await effect.onUse(get(1), get(2), context());

      // Assert
      expect(get(1).currentHp).toBe(0);
      expect(get(2).volatileState.cursed).toBe(true);
    });

    it('マジックガードでも HP を払う', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        types: ['ゴースト'],
        ability: 'マジックガード',
      });
      const effect = new CurseEffect();

      // Act
      await effect.onUse(get(1), get(2), context());

      // Assert
      expect(get(1).currentHp).toBe(50);
    });

    it('すでにのろい状態の相手には失敗し、HP を払わない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { types: ['ゴースト'] },
        { status: { volatileState: { cursed: true } } },
      );
      const effect = new CurseEffect();

      // Act
      const message = await effect.onUse(get(1), get(2), context());

      // Assert
      expect(message).toBe('But it failed');
      expect(get(1).currentHp).toBe(100);
    });
  });
});
