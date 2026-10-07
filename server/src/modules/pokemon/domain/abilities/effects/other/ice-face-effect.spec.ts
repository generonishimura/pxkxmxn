import { IceFaceEffect } from './ice-face-effect';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';
import { AbilityRegistry } from '../../ability-registry';

describe('IceFaceEffect（アイスフェイス）', () => {
  const EISCUE = 875;
  const broken = { iceFaceBroken: true, form: 'noice' };

  describe('blockDamagingHit', () => {
    it('物理技のダメージを防ぎ、ナイスフェイスになる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'アイスフェイス', nationalDex: EISCUE },
        {},
      );

      // Act
      const message = await new IceFaceEffect().blockDamagingHit(
        get(1),
        get(2),
        context({ moveCategory: 'Physical' }),
      );

      // Assert
      expect(message).toBe('Its Ice Face shielded it!');
      expect(get(1).persistentState).toEqual(broken);
      expect(get(1).currentHp).toBe(100);
    });

    it('特殊技は防がない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'アイスフェイス', nationalDex: EISCUE },
        {},
      );

      // Act
      const message = await new IceFaceEffect().blockDamagingHit(
        get(1),
        get(2),
        context({ moveCategory: 'Special' }),
      );

      // Assert
      expect(message).toBeNull();
      expect(get(1).persistentState).toEqual({});
    });

    it('ナイスフェイスのときは防がない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'アイスフェイス', nationalDex: EISCUE, status: { persistentState: broken } },
        {},
      );

      // Act
      const message = await new IceFaceEffect().blockDamagingHit(
        get(1),
        get(2),
        context({ moveCategory: 'Physical' }),
      );

      // Assert
      expect(message).toBeNull();
    });

    it('へんしん中・コオリッポでないときは防がない', async () => {
      // Arrange
      const transformed = createInMemoryBattle(
        {
          ability: 'アイスフェイス',
          nationalDex: EISCUE,
          status: { volatileState: { transformedIntoStatusId: 2 } },
        },
        {},
      );
      const other = createInMemoryBattle({ ability: 'アイスフェイス', nationalDex: 25 }, {});

      // Act
      const results = [
        await new IceFaceEffect().blockDamagingHit(
          transformed.get(1),
          transformed.get(2),
          transformed.context({ moveCategory: 'Physical' }),
        ),
        await new IceFaceEffect().blockDamagingHit(
          other.get(1),
          other.get(2),
          other.context({ moveCategory: 'Physical' }),
        ),
      ];

      // Assert
      expect(results).toEqual([null, null]);
    });
  });

  describe('onWeatherChange', () => {
    it('あられ（ゆき）になったら、アイスフェイスに戻る', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'アイスフェイス', nationalDex: EISCUE, status: { persistentState: broken } },
        {},
      );

      // Act
      await new IceFaceEffect().onWeatherChange(get(1), context({ weather: Weather.Hail }));

      // Assert
      expect(get(1).persistentState).toEqual({});
    });

    it('あられでない天候では戻らない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'アイスフェイス', nationalDex: EISCUE, status: { persistentState: broken } },
        {},
      );

      // Act
      await new IceFaceEffect().onWeatherChange(get(1), context({ weather: Weather.Rain }));

      // Assert
      expect(get(1).persistentState).toEqual(broken);
    });

    it('ひんしのときは戻らない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {
          ability: 'アイスフェイス',
          nationalDex: EISCUE,
          status: { currentHp: 0, persistentState: broken },
        },
        {},
      );

      // Act
      await new IceFaceEffect().onWeatherChange(get(1), context({ weather: Weather.Hail }));

      // Assert
      expect(get(1).persistentState).toEqual(broken);
    });
  });

  describe('onEntry', () => {
    beforeEach(() => {
      AbilityRegistry.initialize();
    });

    it('あられの場に出たら、アイスフェイスに戻る', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle(
        { ability: 'アイスフェイス', nationalDex: EISCUE, status: { persistentState: broken } },
        {},
      );
      await battleRepository.update(1, { weather: Weather.Hail });

      // Act
      await new IceFaceEffect().onEntry(get(1), context());

      // Assert
      expect(get(1).persistentState).toEqual({});
    });

    it('相手がノーてんきで天候が消えているあられの場に出ても、戻らない', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle(
        { ability: 'アイスフェイス', nationalDex: EISCUE, status: { persistentState: broken } },
        { ability: 'ノーてんき' },
      );
      await battleRepository.update(1, { weather: Weather.Hail });

      // Act
      await new IceFaceEffect().onEntry(get(1), context());

      // Assert
      expect(get(1).persistentState).toEqual(broken);
    });

    it('ノーてんきのポケモンが控えにいるだけなら、あられの場に出たら戻る', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle(
        { ability: 'アイスフェイス', nationalDex: EISCUE, status: { persistentState: broken } },
        { ability: 'ノーてんき', status: { isActive: false } },
      );
      await battleRepository.update(1, { weather: Weather.Hail });

      // Act
      await new IceFaceEffect().onEntry(get(1), context());

      // Assert
      expect(get(1).persistentState).toEqual({});
    });
  });
});
