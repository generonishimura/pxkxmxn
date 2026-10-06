import { ThermalExchangeEffect } from './thermal-exchange-effect';
import { AbilityRegistry } from '../../ability-registry';
import { HitResult } from '../../../battle-events/hit-result';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { canInflictStatus } from '../../../battle-events/status-infliction';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

describe('ThermalExchangeEffect（ねつこうかん）', () => {
  const hit = (overrides: Partial<HitResult> = {}): HitResult => ({
    damage: 30,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact: false,
    moveTypeName: 'ほのお',
    moveCategory: 'Special',
    targetFainted: false,
    ...overrides,
  });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('レジストリに ねつこうかん として登録されている', () => {
    // Arrange & Act
    const effect = AbilityRegistry.get('ねつこうかん');

    // Assert
    expect(effect).toBeInstanceOf(ThermalExchangeEffect);
  });

  describe('onDamagingHit', () => {
    it('ほのおタイプの技でダメージを受けたら、攻撃を1段階上げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'ねつこうかん', status: { currentHp: 70 } },
      );

      // Act
      const message = await new ThermalExchangeEffect().onDamagingHit(
        get(2),
        get(1),
        hit(),
        context(),
      );

      // Assert
      expect(get(2).attackRank).toBe(1);
      expect(message).toBe('Attack rose!');
    });

    it('ほのおタイプ以外の技では、攻撃を上げない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { ability: 'ねつこうかん' });

      // Act
      const message = await new ThermalExchangeEffect().onDamagingHit(
        get(2),
        get(1),
        hit({ moveTypeName: 'みず' }),
        context(),
      );

      // Assert
      expect(get(2).attackRank).toBe(0);
      expect(message).toBeNull();
    });

    it('攻撃側がかたやぶりなら、攻撃を上げない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'かたやぶり' },
        { ability: 'ねつこうかん' },
      );

      // Act
      const message = await new ThermalExchangeEffect().onDamagingHit(
        get(2),
        get(1),
        hit(),
        context({ attackerAbilityName: 'かたやぶり', defenderAbilityName: 'ねつこうかん' }),
      );

      // Assert
      expect(get(2).attackRank).toBe(0);
      expect(message).toBeNull();
    });

    it('ひんしになったら、攻撃を上げない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'ねつこうかん', status: { currentHp: 0 } },
      );

      // Act
      const message = await new ThermalExchangeEffect().onDamagingHit(
        get(2),
        get(1),
        hit({ targetFainted: true }),
        context(),
      );

      // Assert
      expect(get(2).attackRank).toBe(0);
      expect(message).toBeNull();
    });
  });

  describe('canReceiveStatusCondition', () => {
    it('やけどにならない', () => {
      // Arrange
      const { get } = createInMemoryBattle({}, { ability: 'ねつこうかん' });

      // Act
      const result = new ThermalExchangeEffect().canReceiveStatusCondition(
        get(2),
        StatusCondition.Burn,
      );

      // Assert
      expect(result).toBe(false);
    });

    it('やけど以外の状態異常にはなる', () => {
      // Arrange
      const { get } = createInMemoryBattle({}, { ability: 'ねつこうかん' });

      // Act
      const result = new ThermalExchangeEffect().canReceiveStatusCondition(
        get(2),
        StatusCondition.Paralysis,
      );

      // Assert
      expect(result).toBe(true);
    });

    it('相手の技でやけどにしようとしても、付与できない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { ability: 'ねつこうかん' });

      // Act
      const result = await canInflictStatus(get(2), StatusCondition.Burn, context(), {
        source: { pokemon: get(1), kind: 'move', name: 'おにび' },
      });

      // Assert
      expect(result).toBe(false);
    });
  });
});
