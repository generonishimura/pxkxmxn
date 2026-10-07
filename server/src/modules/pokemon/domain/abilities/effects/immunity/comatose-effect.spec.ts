import { ComatoseEffect } from './comatose-effect';
import { AbilityRegistry } from '../../ability-registry';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { canInflictStatus } from '../../../battle-events/status-infliction';
import { canApplyVolatile } from '../../../battle-events/volatile-infliction';
import { resolveEffectiveStatusCondition } from '../../../battle-events/effective-status';

describe('ComatoseEffect（ぜったいねむり）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('canReceiveStatusCondition', () => {
    it.each([
      StatusCondition.Sleep,
      StatusCondition.Burn,
      StatusCondition.Paralysis,
      StatusCondition.Poison,
      StatusCondition.BadPoison,
      StatusCondition.Freeze,
    ])('状態異常（%s）にならない', status => {
      // Arrange
      const { get } = createInMemoryBattle({ ability: 'ぜったいねむり' });

      // Act
      const result = new ComatoseEffect().canReceiveStatusCondition(get(1), status);

      // Assert
      expect(result).toBe(false);
    });

    it.each([StatusCondition.Confusion, StatusCondition.Flinch])(
      'こんらん・ひるみ（%s）は防がない',
      status => {
        // Arrange
        const { get } = createInMemoryBattle({ ability: 'ぜったいねむり' });

        // Act
        const result = new ComatoseEffect().canReceiveStatusCondition(get(1), status);

        // Assert
        expect(result).toBe(true);
      },
    );
  });

  it('状態異常がなくても、ねむりとして扱う', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ ability: 'ぜったいねむり' });

    // Act
    const status = await resolveEffectiveStatusCondition(get(1), context());

    // Assert
    expect(status).toBe(StatusCondition.Sleep);
  });

  it('かたやぶりの相手の技でも、状態異常にならない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'かたやぶり' },
      { ability: 'ぜったいねむり' },
    );

    // Act
    const result = await canInflictStatus(get(2), StatusCondition.Paralysis, context(), {
      source: { pokemon: get(1), kind: 'move', name: 'でんじは' },
    });

    // Assert
    expect(result).toBe(false);
  });

  it('あくびを受けない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { ability: 'ぜったいねむり' });

    // Act
    const result = await canApplyVolatile(get(2), 'yawn', context(), {
      source: { pokemon: get(1), kind: 'move', name: 'あくび' },
    });

    // Assert
    expect(result).toBe(false);
  });

  it('AbilityRegistryに「ぜったいねむり」として登録されている', () => {
    // Arrange
    // （beforeEach でレジストリを初期化済み）

    // Act
    const effect = AbilityRegistry.get('ぜったいねむり');

    // Assert
    expect(effect).toBeInstanceOf(ComatoseEffect);
  });
});
