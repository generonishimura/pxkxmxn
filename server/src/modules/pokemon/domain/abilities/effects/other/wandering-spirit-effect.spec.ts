import { WanderingSpiritEffect } from './wandering-spirit-effect';
import { AbilityRegistry } from '../../ability-registry';
import { HitResult } from '../../../battle-events/hit-result';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('WanderingSpiritEffect（さまようたましい）', () => {
  const hit = (isContact = true, targetFainted = false): HitResult => ({
    damage: 30,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact,
    moveTypeName: 'ノーマル',
    moveCategory: 'Physical',
    targetFainted,
  });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('さまようたましい として登録されている', () => {
    // Arrange & Act
    const effect = AbilityRegistry.get('さまようたましい');

    // Assert
    expect(effect).toBeInstanceOf(WanderingSpiritEffect);
  });

  it('接触技を受けたら、攻撃してきた相手と特性を入れ替える', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'ふみん' },
      { ability: 'さまようたましい' },
    );

    // Act
    const message = await new WanderingSpiritEffect().onDamagingHit(
      get(2),
      get(1),
      hit(),
      context(),
    );

    // Assert
    expect(get(1).volatileState.abilityOverride).toBe('さまようたましい');
    expect(get(2).volatileState.abilityOverride).toBe('ふみん');
    expect(message).toBe('さまようたましい swapped abilities with the attacker!');
  });

  it('受け取った特性が場に出たときの特性なら発動する（いかく）', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'いかく' },
      { ability: 'さまようたましい' },
    );

    // Act
    await new WanderingSpiritEffect().onDamagingHit(get(2), get(1), hit(), context());

    // Assert
    expect(get(2).volatileState.abilityOverride).toBe('いかく');
    expect(get(1).attackRank).toBe(-1);
  });

  it('接触しない技では何もしない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'ふみん' },
      { ability: 'さまようたましい' },
    );

    // Act
    const message = await new WanderingSpiritEffect().onDamagingHit(
      get(2),
      get(1),
      hit(false),
      context(),
    );

    // Assert
    expect(get(1).volatileState.abilityOverride).toBeUndefined();
    expect(get(2).volatileState.abilityOverride).toBeUndefined();
    expect(message).toBeNull();
  });

  it('相手の特性が入れ替えられない特性（ふしぎなまもり）なら何もしない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'ふしぎなまもり' },
      { ability: 'さまようたましい' },
    );

    // Act
    const message = await new WanderingSpiritEffect().onDamagingHit(
      get(2),
      get(1),
      hit(),
      context(),
    );

    // Assert
    expect(get(1).volatileState.abilityOverride).toBeUndefined();
    expect(get(2).volatileState.abilityOverride).toBeUndefined();
    expect(message).toBeNull();
  });

  it('相手の特性が消せない特性（うのミサイル）なら何もしない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'うのミサイル' },
      { ability: 'さまようたましい' },
    );

    // Act
    const message = await new WanderingSpiritEffect().onDamagingHit(
      get(2),
      get(1),
      hit(),
      context(),
    );

    // Assert
    expect(get(1).volatileState.abilityOverride).toBeUndefined();
    expect(get(2).volatileState.abilityOverride).toBeUndefined();
    expect(message).toBeNull();
  });

  it('自分がひんしになったヒットでは、相手だけが さまようたましい になる（本家の setAbility の順）', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'ふみん' },
      { ability: 'さまようたましい', status: { currentHp: 0 } },
    );

    // Act
    await new WanderingSpiritEffect().onDamagingHit(get(2), get(1), hit(true, true), context());

    // Assert
    expect(get(1).volatileState.abilityOverride).toBe('さまようたましい');
    expect(get(2).volatileState.abilityOverride).toBeUndefined();
  });
});
