import { AngerPointEffect } from './anger-point-effect';
import { AbilityRegistry } from '../../ability-registry';
import { HitResult } from '../../../battle-events/hit-result';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('AngerPointEffect（いかりのつぼ）', () => {
  const hit = (overrides: Partial<HitResult> = {}): HitResult => ({
    damage: 30,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact: true,
    moveTypeName: 'ノーマル',
    moveCategory: 'Physical',
    targetFainted: false,
    isCriticalHit: true,
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

  it('いかりのつぼ として登録されている', () => {
    // Arrange & Act
    const effect = AbilityRegistry.get('いかりのつぼ');

    // Assert
    expect(effect).toBeInstanceOf(AngerPointEffect);
  });

  describe('onDamagingHit', () => {
    it('急所に当たったら、攻撃ランクを最大の+6にする', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'いかりのつぼ', status: { currentHp: 70 } },
      );

      // Act
      const message = await new AngerPointEffect().onDamagingHit(get(2), get(1), hit(), context());

      // Assert
      expect(get(2).attackRank).toBe(6);
      expect(message).toBe('Attack rose!');
    });

    it('攻撃ランクが-6でも、急所に当たったら+6になる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'いかりのつぼ', status: { currentHp: 70, attackRank: -6 } },
      );

      // Act
      await new AngerPointEffect().onDamagingHit(get(2), get(1), hit(), context());

      // Assert
      expect(get(2).attackRank).toBe(6);
    });

    it('急所でないヒットでは、攻撃ランクを変えない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'いかりのつぼ', status: { currentHp: 70 } },
      );

      // Act
      const message = await new AngerPointEffect().onDamagingHit(
        get(2),
        get(1),
        hit({ isCriticalHit: false }),
        context(),
      );

      // Assert
      expect(get(2).attackRank).toBe(0);
      expect(message).toBeNull();
    });

    it('急所でひんしになったときは、攻撃ランクを変えない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'いかりのつぼ', status: { currentHp: 0 } },
      );

      // Act
      const message = await new AngerPointEffect().onDamagingHit(
        get(2),
        get(1),
        hit({ damage: 100, targetFainted: true }),
        context(),
      );

      // Assert
      expect(get(2).attackRank).toBe(0);
      expect(message).toBeNull();
    });

    it('攻撃ランクがすでに+6なら、ランクは変わらない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'いかりのつぼ', status: { currentHp: 70, attackRank: 6 } },
      );

      // Act
      await new AngerPointEffect().onDamagingHit(get(2), get(1), hit(), context());

      // Assert
      expect(get(2).attackRank).toBe(6);
    });
  });
});
