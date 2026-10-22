import { ToxicChainEffect } from './toxic-chain-effect';
import { AbilityRegistry } from '../../ability-registry';
import { HitResult } from '../../../battle-events/hit-result';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

describe('ToxicChainEffect（どくのくさり）', () => {
  const hit = (overrides: Partial<HitResult> = {}): HitResult => ({
    damage: 30,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact: false,
    moveTypeName: 'あく',
    moveCategory: 'Special',
    targetFainted: false,
    ...overrides,
  });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('レジストリに どくのくさり として登録されている', () => {
    // Arrange & Act
    const effect = AbilityRegistry.get('どくのくさり');

    // Assert
    expect(effect).toBeInstanceOf(ToxicChainEffect);
  });

  describe('onSourceDamagingHit', () => {
    it('乱数が0.3未満なら、接触しない技でも相手をもうどくにする', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0.29);
      const { context, get } = createInMemoryBattle(
        { ability: 'どくのくさり' },
        { status: { currentHp: 70 } },
      );

      // Act
      const message = await new ToxicChainEffect().onSourceDamagingHit(
        get(1),
        get(2),
        hit(),
        context({ attackerAbilityName: 'どくのくさり', attacker: get(1), defender: get(2) }),
      );

      // Assert
      expect(get(2).statusCondition).toBe(StatusCondition.BadPoison);
      expect(message).toBe('was badly poisoned!');
    });

    it('乱数が0.3以上なら、もうどくにしない', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0.3);
      const { context, get } = createInMemoryBattle({ ability: 'どくのくさり' }, {});

      // Act
      const message = await new ToxicChainEffect().onSourceDamagingHit(
        get(1),
        get(2),
        hit(),
        context(),
      );

      // Assert
      expect(get(2).statusCondition).toBeNull();
      expect(message).toBeNull();
    });

    it('てんのめぐみの倍率がコンテキストにあっても、確率は30%のまま', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      const { context, get } = createInMemoryBattle({ ability: 'どくのくさり' }, {});

      // Act
      const message = await new ToxicChainEffect().onSourceDamagingHit(
        get(1),
        get(2),
        hit(),
        context({ secondaryEffectChanceMultiplier: 2 }),
      );

      // Assert
      expect(get(2).statusCondition).toBeNull();
      expect(message).toBeNull();
    });

    it('相手がりんぷんで追加効果を防ぐなら、もうどくにしない', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const { context, get } = createInMemoryBattle({ ability: 'どくのくさり' }, {});

      // Act
      const message = await new ToxicChainEffect().onSourceDamagingHit(
        get(1),
        get(2),
        hit(),
        context({ secondaryEffectsSuppressed: true }),
      );

      // Assert
      expect(get(2).statusCondition).toBeNull();
      expect(message).toBeNull();
    });

    it('相手がはがねタイプなら、もうどくにしない', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const { context, get } = createInMemoryBattle(
        { ability: 'どくのくさり' },
        { types: ['はがね'] },
      );

      // Act
      const message = await new ToxicChainEffect().onSourceDamagingHit(
        get(1),
        get(2),
        hit(),
        context(),
      );

      // Assert
      expect(get(2).statusCondition).toBeNull();
      expect(message).toBeNull();
    });

    it('相手がすでに状態異常なら、もうどくにしない', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const { context, get } = createInMemoryBattle(
        { ability: 'どくのくさり' },
        { status: { statusCondition: StatusCondition.Paralysis } },
      );

      // Act
      const message = await new ToxicChainEffect().onSourceDamagingHit(
        get(1),
        get(2),
        hit(),
        context(),
      );

      // Assert
      expect(get(2).statusCondition).toBe(StatusCondition.Paralysis);
      expect(message).toBeNull();
    });

    it('相手がひんしになったら、もうどくにしない', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const { context, get } = createInMemoryBattle(
        { ability: 'どくのくさり' },
        { status: { currentHp: 0 } },
      );

      // Act
      const message = await new ToxicChainEffect().onSourceDamagingHit(
        get(1),
        get(2),
        hit({ targetFainted: true }),
        context(),
      );

      // Assert
      expect(get(2).statusCondition).toBeNull();
      expect(message).toBeNull();
    });
  });
});
