import { JustifiedEffect } from './justified-effect';
import { AbilityRegistry } from '../../ability-registry';
import { HitResult } from '../../../battle-events/hit-result';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('JustifiedEffect（せいぎのこころ）', () => {
  const hit = (moveTypeName: string): HitResult => ({
    damage: 30,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact: true,
    moveTypeName,
    moveCategory: 'Physical',
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

  it('あくタイプの技でダメージを受けると、攻撃を1段階上げる', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { ability: 'せいぎのこころ', status: { currentHp: 70 } },
    );

    // Act
    const message = await new JustifiedEffect().onDamagingHit(
      get(2),
      get(1),
      hit('あく'),
      context(),
    );

    // Assert
    expect(get(2).attackRank).toBe(1);
    expect(message).toBe('Attack rose!');
  });

  it('あくタイプ以外の技では、攻撃を上げない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { ability: 'せいぎのこころ', status: { currentHp: 70 } },
    );

    // Act
    const message = await new JustifiedEffect().onDamagingHit(
      get(2),
      get(1),
      hit('ゴースト'),
      context(),
    );

    // Assert
    expect(get(2).attackRank).toBe(0);
    expect(message).toBeNull();
  });

  it('ひんしになったら、攻撃を上げない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { ability: 'せいぎのこころ', status: { currentHp: 0 } },
    );

    // Act
    const message = await new JustifiedEffect().onDamagingHit(
      get(2),
      get(1),
      { ...hit('あく'), targetFainted: true },
      context(),
    );

    // Assert
    expect(get(2).attackRank).toBe(0);
    expect(message).toBeNull();
  });

  it('攻撃ランクが+6なら、ランクは変わらない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { ability: 'せいぎのこころ', status: { currentHp: 70, attackRank: 6 } },
    );

    // Act
    const message = await new JustifiedEffect().onDamagingHit(
      get(2),
      get(1),
      hit('あく'),
      context(),
    );

    // Assert
    expect(get(2).attackRank).toBe(6);
    expect(message).toBeNull();
  });
});
