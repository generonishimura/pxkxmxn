import { StaminaEffect } from './stamina-effect';
import { AbilityRegistry } from '../../ability-registry';
import { HitResult } from '../../../battle-events/hit-result';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('StaminaEffect（じきゅうりょく）', () => {
  const hit = (overrides: Partial<HitResult> = {}): HitResult => ({
    damage: 30,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact: false,
    moveTypeName: 'ほのお',
    moveCategory: 'Special',
    targetFainted: false,
    ...overrides,
  });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('onDamagingHit', () => {
    it('攻撃技のダメージを受けたら、防御を1段階上げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'じきゅうりょく', status: { currentHp: 70 } },
      );

      // Act
      const message = await new StaminaEffect().onDamagingHit(get(2), get(1), hit(), context());

      // Assert
      expect(get(2).defenseRank).toBe(1);
      expect(message).toBe('Defense rose!');
    });

    it('連続技ではヒットごとに防御を1段階ずつ上げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'じきゅうりょく', status: { currentHp: 70 } },
      );
      const effect = new StaminaEffect();

      // Act
      await effect.onDamagingHit(get(2), get(1), hit({ hitIndex: 0, hitCount: 1 }), context());
      await effect.onDamagingHit(get(2), get(1), hit({ hitIndex: 1, hitCount: 2 }), context());

      // Assert
      expect(get(2).defenseRank).toBe(2);
    });

    it('ひんしになったヒットでは、防御を上げない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'じきゅうりょく', status: { currentHp: 0 } },
      );

      // Act
      const message = await new StaminaEffect().onDamagingHit(
        get(2),
        get(1),
        hit({ damage: 100, targetFainted: true }),
        context(),
      );

      // Assert
      expect(get(2).defenseRank).toBe(0);
      expect(message).toBeNull();
    });

    it('防御ランクが+6なら、ランクは変わらない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'じきゅうりょく', status: { currentHp: 70, defenseRank: 6 } },
      );

      // Act
      const message = await new StaminaEffect().onDamagingHit(get(2), get(1), hit(), context());

      // Assert
      expect(get(2).defenseRank).toBe(6);
      expect(message).toBeNull();
    });
  });

  it('AbilityRegistryに「じきゅうりょく」として登録されている', () => {
    // Arrange
    // （beforeEach でレジストリを初期化済み）

    // Act
    const effect = AbilityRegistry.get('じきゅうりょく');

    // Assert
    expect(effect).toBeInstanceOf(StaminaEffect);
  });
});
