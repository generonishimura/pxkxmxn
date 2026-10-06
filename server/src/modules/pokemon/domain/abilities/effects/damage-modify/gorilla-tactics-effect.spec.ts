import { GorillaTacticsEffect } from './gorilla-tactics-effect';
import { AbilityRegistry } from '../../ability-registry';
import { BattleContext } from '../../battle-context.interface';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('GorillaTacticsEffect（ごりむちゅう）', () => {
  const { context, get } = createInMemoryBattle({ ability: 'ごりむちゅう' }, {});
  const pokemon = get(1);
  const physical = (moveName = 'じしん'): BattleContext =>
    context({ moveName, moveCategory: 'Physical' });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('ごりむちゅうとして登録されている', () => {
    // Act
    const effect = AbilityRegistry.get('ごりむちゅう');

    // Assert
    expect(effect).toBeInstanceOf(GorillaTacticsEffect);
  });

  it('最初に出した技に固定される', () => {
    // Act
    const effect = new GorillaTacticsEffect();

    // Assert
    expect(effect.locksMoveChoice).toBe(true);
  });

  it('物理技のダメージを 1.5 倍（6144/4096）にする', () => {
    // Act
    const damage = new GorillaTacticsEffect().modifyDamageDealt(pokemon, 100, physical());

    // Assert
    expect(damage).toBe(150);
  });

  it('1.5 倍の端数は、ちょうど 0.5 なら切り捨てる', () => {
    // Act
    const damage = new GorillaTacticsEffect().modifyDamageDealt(pokemon, 101, physical());

    // Assert
    expect(damage).toBe(151);
  });

  it('特殊技のダメージは変えない', () => {
    // Act
    const damage = new GorillaTacticsEffect().modifyDamageDealt(
      pokemon,
      100,
      context({ moveName: '１０まんボルト', moveCategory: 'Special' }),
    );

    // Assert
    expect(damage).toBeUndefined();
  });

  it.each(['イカサマ', 'ボディプレス'])(
    '自分の攻撃を使わない %s のダメージは変えない',
    moveName => {
      // Act
      const damage = new GorillaTacticsEffect().modifyDamageDealt(pokemon, 100, physical(moveName));

      // Assert
      expect(damage).toBeUndefined();
    },
  );

  it('相手のイカサマは、自分の攻撃を使うので 1.5 倍のダメージを受ける', () => {
    // Act
    const damage = new GorillaTacticsEffect().modifyDamage(pokemon, 100, physical('イカサマ'));

    // Assert
    expect(damage).toBe(150);
  });

  it('相手のイカサマ以外の技で受けるダメージは変えない', () => {
    // Act
    const damage = new GorillaTacticsEffect().modifyDamage(pokemon, 100, physical());

    // Assert
    expect(damage).toBe(100);
  });

  it('かたやぶりで無視されない', () => {
    // Act
    const ignored = AbilityRegistry.isIgnoredByMoldBreaker('かたやぶり', 'ごりむちゅう');

    // Assert
    expect(ignored).toBe(false);
  });
});
