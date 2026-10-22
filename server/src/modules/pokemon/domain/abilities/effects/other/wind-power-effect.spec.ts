import { WindPowerEffect } from './wind-power-effect';
import { AbilityRegistry } from '../../ability-registry';
import { HitResult } from '../../../battle-events/hit-result';
import { MoveFlag } from '../../../moves/move-flags';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('WindPowerEffect（ふうりょくでんき）', () => {
  const hit: HitResult = {
    damage: 30,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact: false,
    moveTypeName: 'ひこう',
    moveCategory: 'Special',
    targetFainted: false,
  };
  const flags = (...names: MoveFlag[]): ReadonlySet<MoveFlag> => new Set(names);

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('ふうりょくでんきとして登録されている', () => {
    // Act
    const effect = AbilityRegistry.get('ふうりょくでんき');

    // Assert
    expect(effect).toBeInstanceOf(WindPowerEffect);
  });

  it('風技でダメージを受けると、じゅうでん状態になる', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { ability: 'ふうりょくでんき', status: { currentHp: 70 } },
    );

    // Act
    const message = await new WindPowerEffect().onDamagingHit(
      get(2),
      get(1),
      hit,
      context({ moveName: 'エアカッター', moveFlags: flags('slicing', 'wind') }),
    );

    // Assert
    expect(get(2).volatileState.charged).toBe(true);
    expect(message).toBe('became charged!');
  });

  it('風技でない技では、じゅうでん状態にならない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { ability: 'ふうりょくでんき', status: { currentHp: 70 } },
    );

    // Act
    const message = await new WindPowerEffect().onDamagingHit(
      get(2),
      get(1),
      { ...hit, isContact: true, moveTypeName: 'ノーマル', moveCategory: 'Physical' },
      context({ moveName: 'たいあたり', moveFlags: flags('contact') }),
    );

    // Assert
    expect(get(2).volatileState.charged).toBeUndefined();
    expect(message).toBeNull();
  });

  it('風技でひんしになったら、じゅうでん状態にならない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { ability: 'ふうりょくでんき', status: { currentHp: 0 } },
    );

    // Act
    const message = await new WindPowerEffect().onDamagingHit(
      get(2),
      get(1),
      { ...hit, targetFainted: true },
      context({ moveName: 'ぼうふう', moveFlags: flags('wind') }),
    );

    // Assert
    expect(get(2).volatileState.charged).toBeUndefined();
    expect(message).toBeNull();
  });
});
