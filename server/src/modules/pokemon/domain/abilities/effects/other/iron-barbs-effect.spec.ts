import { IronBarbsEffect } from './iron-barbs-effect';
import { HitResult } from '../../../battle-events/hit-result';
import { AbilityRegistry } from '../../ability-registry';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('IronBarbsEffect（てつのトゲ）', () => {
  const createHit = (isContact: boolean): HitResult => ({
    damage: 10,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact,
    moveTypeName: 'ノーマル',
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

  describe('onDamagingHit', () => {
    it('接触技を受けたとき、攻撃側に最大HPの1/8（切り捨て）のダメージを与える', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { status: { currentHp: 150, maxHp: 175 } },
        { ability: 'てつのトゲ', status: { currentHp: 50 } },
      );

      // Act
      const result = await new IronBarbsEffect().onDamagingHit(
        get(2),
        get(1),
        createHit(true),
        context({ moveFlags: new Set(['contact']), moveCategory: 'Physical' }),
      );

      // Assert
      expect(result).toBe('てつのトゲ activated!');
      expect(get(1).currentHp).toBe(129);
    });

    it('接触しない技では、攻撃側にダメージを与えない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { status: { currentHp: 160, maxHp: 160 } },
        { ability: 'てつのトゲ', status: { currentHp: 50 } },
      );

      // Act
      const result = await new IronBarbsEffect().onDamagingHit(
        get(2),
        get(1),
        createHit(false),
        context({ moveFlags: new Set(), moveCategory: 'Physical' }),
      );

      // Assert
      expect(result).toBeNull();
      expect(get(1).currentHp).toBe(160);
    });

    it('攻撃側が技以外のダメージを受けない特性（マジックガード）なら、ダメージを与えない', async () => {
      // Arrange
      AbilityRegistry.register('テストマジックガード', { preventsIndirectDamage: true });
      const { context, get } = createInMemoryBattle(
        { ability: 'テストマジックガード', status: { currentHp: 160, maxHp: 160 } },
        { ability: 'てつのトゲ', status: { currentHp: 50 } },
      );

      // Act
      const result = await new IronBarbsEffect().onDamagingHit(
        get(2),
        get(1),
        createHit(true),
        context({ moveFlags: new Set(['contact']), moveCategory: 'Physical' }),
      );

      // Assert
      expect(result).toBeNull();
      expect(get(1).currentHp).toBe(160);
    });

    it('攻撃側の最大HPが8未満でも、最低1のダメージを与える', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { status: { currentHp: 5, maxHp: 5 } },
        { ability: 'てつのトゲ', status: { currentHp: 50 } },
      );

      // Act
      await new IronBarbsEffect().onDamagingHit(
        get(2),
        get(1),
        createHit(true),
        context({ moveFlags: new Set(['contact']), moveCategory: 'Physical' }),
      );

      // Assert
      expect(get(1).currentHp).toBe(4);
    });
  });

  it('AbilityRegistryに「てつのトゲ」として登録されている', () => {
    // Arrange
    // （beforeEach でレジストリを初期化済み）

    // Act
    const effect = AbilityRegistry.get('てつのトゲ');

    // Assert
    expect(effect).toBeInstanceOf(IronBarbsEffect);
  });
});
