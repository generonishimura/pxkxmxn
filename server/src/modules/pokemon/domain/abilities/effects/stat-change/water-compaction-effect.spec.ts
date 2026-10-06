import { WaterCompactionEffect } from './water-compaction-effect';
import { AbilityRegistry } from '../../ability-registry';
import { HitResult } from '../../../battle-events/hit-result';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('WaterCompactionEffect（みずがため）', () => {
  const hit = (overrides: Partial<HitResult> = {}): HitResult => ({
    damage: 30,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact: false,
    moveTypeName: 'みず',
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
    it('みずタイプの攻撃技のダメージを受けたら、防御を2段階上げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'みずがため', status: { currentHp: 70 } },
      );

      // Act
      const message = await new WaterCompactionEffect().onDamagingHit(
        get(2),
        get(1),
        hit(),
        context(),
      );

      // Assert
      expect(get(2).defenseRank).toBe(2);
      expect(message).toBe('Defense rose!');
    });

    it('みずタイプ以外の攻撃技では、防御を上げない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'みずがため', status: { currentHp: 70 } },
      );

      // Act
      const message = await new WaterCompactionEffect().onDamagingHit(
        get(2),
        get(1),
        hit({ moveTypeName: 'ほのお' }),
        context(),
      );

      // Assert
      expect(get(2).defenseRank).toBe(0);
      expect(message).toBeNull();
    });

    it('防御ランクが+5なら、+6までしか上がらない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'みずがため', status: { currentHp: 70, defenseRank: 5 } },
      );

      // Act
      await new WaterCompactionEffect().onDamagingHit(get(2), get(1), hit(), context());

      // Assert
      expect(get(2).defenseRank).toBe(6);
    });

    it('ひんしになったヒットでは、防御を上げない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'みずがため', status: { currentHp: 0 } },
      );

      // Act
      const message = await new WaterCompactionEffect().onDamagingHit(
        get(2),
        get(1),
        hit({ damage: 100, targetFainted: true }),
        context(),
      );

      // Assert
      expect(get(2).defenseRank).toBe(0);
      expect(message).toBeNull();
    });
  });

  it('AbilityRegistryに「みずがため」として登録されている', () => {
    // Arrange
    // （beforeEach でレジストリを初期化済み）

    // Act
    const effect = AbilityRegistry.get('みずがため');

    // Assert
    expect(effect).toBeInstanceOf(WaterCompactionEffect);
  });
});
