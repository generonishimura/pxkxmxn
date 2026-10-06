import { SteamEngineEffect } from './steam-engine-effect';
import { AbilityRegistry } from '../../ability-registry';
import { HitResult } from '../../../battle-events/hit-result';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('SteamEngineEffect（じょうききかん）', () => {
  const hit = (moveTypeName: string): HitResult => ({
    damage: 30,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact: false,
    moveTypeName,
    moveCategory: 'Special',
    targetFainted: false,
  });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('じょうききかん として登録されている', () => {
    // Arrange & Act
    const effect = AbilityRegistry.get('じょうききかん');

    // Assert
    expect(effect).toBeInstanceOf(SteamEngineEffect);
  });

  describe('onDamagingHit', () => {
    it.each(['ほのお', 'みず'])('%sタイプの技を受けたら、素早さを6段階上げる', async moveType => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { ability: 'じょうききかん' });

      // Act
      const message = await new SteamEngineEffect().onDamagingHit(
        get(2),
        get(1),
        hit(moveType),
        context(),
      );

      // Assert
      expect(get(2).speedRank).toBe(6);
      expect(message).not.toBeNull();
    });

    it('素早さランクが+2でも、上限の+6までしか上がらない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'じょうききかん', status: { speedRank: 2 } },
      );

      // Act
      await new SteamEngineEffect().onDamagingHit(get(2), get(1), hit('みず'), context());

      // Assert
      expect(get(2).speedRank).toBe(6);
    });

    it('ほのお・みず以外のタイプの技では、素早さを上げない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { ability: 'じょうききかん' });

      // Act
      const message = await new SteamEngineEffect().onDamagingHit(
        get(2),
        get(1),
        hit('でんき'),
        context(),
      );

      // Assert
      expect(get(2).speedRank).toBe(0);
      expect(message).toBeNull();
    });

    it('ひんしになったら、素早さを上げない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'じょうききかん', status: { currentHp: 0 } },
      );

      // Act
      const message = await new SteamEngineEffect().onDamagingHit(
        get(2),
        get(1),
        hit('ほのお'),
        context(),
      );

      // Assert
      expect(get(2).speedRank).toBe(0);
      expect(message).toBeNull();
    });
  });
});
