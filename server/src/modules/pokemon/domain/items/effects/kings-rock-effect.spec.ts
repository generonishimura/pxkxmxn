import { KingsRockEffect } from './kings-rock-effect';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { HitResult } from '../../battle-events/hit-result';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('KingsRockEffect（おうじゃのしるし）', () => {
  const hit: HitResult = {
    damage: 30,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact: true,
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
  });

  it('10% の判定に通ったら、ダメージを与えた相手をひるませる', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();
    jest.spyOn(Math, 'random').mockReturnValue(0.09);

    // Act
    const message = await new KingsRockEffect().onSourceDamagingHit(
      get(1),
      get(2),
      hit,
      context({ moveName: 'たいあたり' }),
    );

    // Assert
    expect(get(2).volatileState.flinched).toBe(true);
    expect(message).toBe('flinched!');
  });

  it('てんのめぐみの倍率が入っていれば、確率が 20% になる', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();
    jest.spyOn(Math, 'random').mockReturnValue(0.15);

    // Act
    await new KingsRockEffect().onSourceDamagingHit(
      get(1),
      get(2),
      hit,
      context({ moveName: 'たいあたり', secondaryEffectChanceMultiplier: 2 }),
    );

    // Assert
    expect(get(2).volatileState.flinched).toBe(true);
  });

  it('もともとひるみの追加効果を持つ技（かみつく）には足さない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();
    jest.spyOn(Math, 'random').mockReturnValue(0);

    // Act
    const message = await new KingsRockEffect().onSourceDamagingHit(
      get(1),
      get(2),
      hit,
      context({ moveName: 'かみつく' }),
    );

    // Assert
    expect(message).toBeNull();
    expect(get(2).volatileState.flinched).toBeUndefined();
  });

  it('持ち主の特性があくしゅうなら、ひるみを重ねない（あくしゅうが判定する）', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ ability: 'あくしゅう' });
    jest.spyOn(Math, 'random').mockReturnValue(0);

    // Act
    const message = await new KingsRockEffect().onSourceDamagingHit(
      get(1),
      get(2),
      hit,
      context({ moveName: 'たいあたり', attackerAbilityName: 'あくしゅう' }),
    );

    // Assert
    expect(message).toBeNull();
  });
});
