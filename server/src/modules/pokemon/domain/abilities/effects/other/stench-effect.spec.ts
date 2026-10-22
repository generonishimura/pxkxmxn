import { StenchEffect } from './stench-effect';
import { AbilityRegistry } from '../../ability-registry';
import { HitResult } from '../../../battle-events/hit-result';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

describe('StenchEffect（あくしゅう）', () => {
  const hit: HitResult = {
    damage: 30,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact: false,
    moveTypeName: 'ノーマル',
    moveCategory: 'Physical',
    targetFainted: false,
  };

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('onSourceDamagingHit', () => {
    it('10%の判定に通ったら、ダメージを与えた相手をひるませる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'あくしゅう' }, {});
      jest.spyOn(Math, 'random').mockReturnValue(0.09);

      // Act
      const message = await new StenchEffect().onSourceDamagingHit(
        get(1),
        get(2),
        hit,
        context({ moveName: 'たいあたり' }),
      );

      // Assert
      expect(get(2).volatileState.flinched).toBe(true);
      expect(message).toBe('flinched!');
    });

    it('10%の判定に外れたら、ひるませない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'あくしゅう' }, {});
      jest.spyOn(Math, 'random').mockReturnValue(0.1);

      // Act
      const message = await new StenchEffect().onSourceDamagingHit(
        get(1),
        get(2),
        hit,
        context({ moveName: 'たいあたり' }),
      );

      // Assert
      expect(get(2).statusCondition).toBeNull();
      expect(message).toBeNull();
    });

    it('てんのめぐみの倍率が入っていれば、確率が20%になる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'あくしゅう' }, {});
      jest.spyOn(Math, 'random').mockReturnValue(0.15);

      // Act
      await new StenchEffect().onSourceDamagingHit(
        get(1),
        get(2),
        hit,
        context({ moveName: 'たいあたり', secondaryEffectChanceMultiplier: 2 }),
      );

      // Assert
      expect(get(2).volatileState.flinched).toBe(true);
    });

    it('相手の追加効果が無効（りんぷん）なら、ひるませない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'あくしゅう' }, {});
      jest.spyOn(Math, 'random').mockReturnValue(0);

      // Act
      const message = await new StenchEffect().onSourceDamagingHit(
        get(1),
        get(2),
        hit,
        context({ moveName: 'たいあたり', secondaryEffectsSuppressed: true }),
      );

      // Assert
      expect(get(2).statusCondition).toBeNull();
      expect(message).toBeNull();
    });

    it.each(['かみつく', 'いわなだれ', 'ねこだまし', 'ひょうざんおろし'])(
      'ひるみの追加効果を持つ技（%s）では、あくしゅうの判定をしない（本家と同じ）',
      async moveName => {
        // Arrange
        const { context, get } = createInMemoryBattle({ ability: 'あくしゅう' }, {});
        jest.spyOn(Math, 'random').mockReturnValue(0);

        // Act
        const message = await new StenchEffect().onSourceDamagingHit(
          get(1),
          get(2),
          hit,
          context({ moveName }),
        );

        // Assert
        expect(get(2).statusCondition).toBeNull();
        expect(message).toBeNull();
      },
    );

    it('相手がせいしんりょくなら、ひるませない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'あくしゅう' },
        { ability: 'せいしんりょく' },
      );
      jest.spyOn(Math, 'random').mockReturnValue(0);

      // Act
      const message = await new StenchEffect().onSourceDamagingHit(
        get(1),
        get(2),
        hit,
        context({ moveName: 'たいあたり' }),
      );

      // Assert
      expect(get(2).statusCondition).toBeNull();
      expect(message).toBeNull();
    });

    it('相手がひんしになったら、ひるませない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'あくしゅう' },
        { status: { currentHp: 0 } },
      );
      jest.spyOn(Math, 'random').mockReturnValue(0);

      // Act
      const message = await new StenchEffect().onSourceDamagingHit(
        get(1),
        get(2),
        { ...hit, targetFainted: true },
        context({ moveName: 'たいあたり' }),
      );

      // Assert
      expect(get(2).statusCondition).toBeNull();
      expect(message).toBeNull();
    });
  });

  it('DB の特性名で登録されている', () => {
    // Act
    const effect = AbilityRegistry.get('あくしゅう');

    // Assert
    expect(effect).toBeInstanceOf(StenchEffect);
  });
});
