import { ElectromorphosisEffect } from './electromorphosis-effect';
import { AbilityRegistry } from '../../ability-registry';
import { HitResult } from '../../../battle-events/hit-result';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('ElectromorphosisEffect（でんきにかえる）', () => {
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

  it('でんきにかえるとして登録されている', () => {
    // Act
    const effect = AbilityRegistry.get('でんきにかえる');

    // Assert
    expect(effect).toBeInstanceOf(ElectromorphosisEffect);
  });

  it('ダメージを受けると、じゅうでん状態になる', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { ability: 'でんきにかえる', status: { currentHp: 70 } },
    );

    // Act
    const message = await new ElectromorphosisEffect().onDamagingHit(
      get(2),
      get(1),
      hit,
      context({ moveName: 'たいあたり' }),
    );

    // Assert
    expect(get(2).volatileState.charged).toBe(true);
    expect(message).toBe('became charged!');
  });

  it('すでにじゅうでん状態でも、もう一度じゅうでんする（状態は変わらない）', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      {
        ability: 'でんきにかえる',
        status: { currentHp: 70, volatileState: { charged: true } },
      },
    );

    // Act
    const message = await new ElectromorphosisEffect().onDamagingHit(
      get(2),
      get(1),
      hit,
      context({ moveName: 'たいあたり' }),
    );

    // Assert
    expect(get(2).volatileState.charged).toBe(true);
    expect(message).toBe('became charged!');
  });

  it('ひんしになったら、じゅうでん状態にならない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { ability: 'でんきにかえる', status: { currentHp: 0 } },
    );

    // Act
    const message = await new ElectromorphosisEffect().onDamagingHit(
      get(2),
      get(1),
      { ...hit, targetFainted: true },
      context({ moveName: 'たいあたり' }),
    );

    // Assert
    expect(get(2).volatileState.charged).toBeUndefined();
    expect(message).toBeNull();
  });
});
