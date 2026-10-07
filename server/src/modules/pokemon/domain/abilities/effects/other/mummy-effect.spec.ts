import { MummyEffect } from './mummy-effect';
import { LingeringAromaEffect } from './lingering-aroma-effect';
import { AbilityRegistry } from '../../ability-registry';
import { HitResult } from '../../../battle-events/hit-result';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe.each([
  ['ミイラ', MummyEffect],
  ['とれないにおい', LingeringAromaEffect],
] as const)('%s（接触した相手の特性を自分の特性にする）', (abilityName, EffectClass) => {
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

  it(`${abilityName} として登録されている`, () => {
    // Arrange & Act
    const effect = AbilityRegistry.get(abilityName);

    // Assert
    expect(effect).toBeInstanceOf(EffectClass);
  });

  it('接触技を受けたら、攻撃してきた相手の特性を自分の特性に書き換える', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ ability: 'いかく' }, { ability: abilityName });

    // Act
    const message = await new EffectClass().onDamagingHit(get(2), get(1), hit(), context());

    // Assert
    expect(get(1).volatileState.abilityOverride).toBe(abilityName);
    expect(message).toBe(`The attacker's ability became ${abilityName}!`);
  });

  it('接触しない技では何もしない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ ability: 'いかく' }, { ability: abilityName });

    // Act
    const message = await new EffectClass().onDamagingHit(get(2), get(1), hit(false), context());

    // Assert
    expect(get(1).volatileState.abilityOverride).toBeUndefined();
    expect(message).toBeNull();
  });

  it('相手の今の特性がすでに同じ特性なら何もしない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'いかく', status: { volatileState: { abilityOverride: abilityName } } },
      { ability: abilityName },
    );

    // Act
    const message = await new EffectClass().onDamagingHit(get(2), get(1), hit(), context());

    // Assert
    expect(message).toBeNull();
  });

  it('相手の特性が消せない特性（バトルスイッチ）なら書き換えない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'バトルスイッチ' },
      { ability: abilityName },
    );

    // Act
    const message = await new EffectClass().onDamagingHit(get(2), get(1), hit(), context());

    // Assert
    expect(get(1).volatileState.abilityOverride).toBeUndefined();
    expect(message).toBeNull();
  });

  it('自分がひんしになったヒットでも、相手の特性を書き換える', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'いかく' },
      { ability: abilityName, status: { currentHp: 0 } },
    );

    // Act
    await new EffectClass().onDamagingHit(get(2), get(1), hit(true, true), context());

    // Assert
    expect(get(1).volatileState.abilityOverride).toBe(abilityName);
  });
});
