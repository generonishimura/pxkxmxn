import { DisguiseEffect } from './disguise-effect';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('DisguiseEffect（ばけのかわ）', () => {
  const MIMIKYU = 778;

  describe('blockDamagingHit', () => {
    it('最初のダメージを防ぎ、ばれたすがたになって最大HPの1/8のダメージを受ける', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'ばけのかわ', nationalDex: MIMIKYU, status: { currentHp: 100, maxHp: 100 } },
        {},
      );

      // Act
      const message = await new DisguiseEffect().blockDamagingHit(get(1), get(2), context());

      // Assert
      expect(message).toBe('Its disguise served it as a decoy!');
      expect(get(1).persistentState).toEqual({ disguiseBusted: true, form: 'busted' });
      expect(get(1).currentHp).toBe(88);
    });

    it('1/8のダメージは切り捨てで、最低1', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'ばけのかわ', nationalDex: MIMIKYU, status: { currentHp: 7, maxHp: 7 } },
        {},
      );

      // Act
      await new DisguiseEffect().blockDamagingHit(get(1), get(2), context());

      // Assert
      expect(get(1).currentHp).toBe(6);
    });

    it('一度ばけのかわが破れたら、もう防がない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {
          ability: 'ばけのかわ',
          nationalDex: MIMIKYU,
          status: { persistentState: { disguiseBusted: true, form: 'busted' } },
        },
        {},
      );

      // Act
      const message = await new DisguiseEffect().blockDamagingHit(get(1), get(2), context());

      // Assert
      expect(message).toBeNull();
      expect(get(1).currentHp).toBe(100);
    });

    it('へんしん中は防がない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {
          ability: 'ばけのかわ',
          nationalDex: MIMIKYU,
          status: { volatileState: { transformedIntoStatusId: 2 } },
        },
        {},
      );

      // Act
      const message = await new DisguiseEffect().blockDamagingHit(get(1), get(2), context());

      // Assert
      expect(message).toBeNull();
      expect(get(1).persistentState.disguiseBusted).toBeUndefined();
    });

    it('ミミッキュでなければ防がない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'ばけのかわ', nationalDex: 25 }, {});

      // Act
      const message = await new DisguiseEffect().blockDamagingHit(get(1), get(2), context());

      // Assert
      expect(message).toBeNull();
    });
  });
});
