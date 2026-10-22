import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { AbilityRegistry } from '../abilities/ability-registry';
import { canInflictStatus } from './status-infliction';
import { createInMemoryBattle } from './__tests__/in-memory-battle';

describe('さわぐの間のねむりの付与', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('場の誰かがさわいでいると、ねむりにできない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ status: { volatileState: { uproar: true } } });

    // Act
    const result = await canInflictStatus(
      get(2),
      StatusCondition.Sleep,
      context({ attacker: get(1), defender: get(2) }),
    );

    // Assert
    expect(result).toBe(false);
  });

  it('さわいでいるポケモン自身もねむりにできない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ status: { volatileState: { uproar: true } } });

    // Act
    const result = await canInflictStatus(get(1), StatusCondition.Sleep, context());

    // Assert
    expect(result).toBe(false);
  });

  it('さわいでいても、ねむり以外の状態異常にはできる', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ status: { volatileState: { uproar: true } } });

    // Act
    const result = await canInflictStatus(
      get(2),
      StatusCondition.Paralysis,
      context({ attacker: get(1), defender: get(2) }),
    );

    // Assert
    expect(result).toBe(true);
  });

  it('誰もさわいでいなければ、ねむりにできる', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();

    // Act
    const result = await canInflictStatus(get(2), StatusCondition.Sleep, context());

    // Assert
    expect(result).toBe(true);
  });
});
