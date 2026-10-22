import { MercilessEffect } from './merciless-effect';
import { AbilityRegistry } from '../../ability-registry';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('MercilessEffect（ひとでなし）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('ひとでなし として登録されている', () => {
    // Arrange & Act
    const effect = AbilityRegistry.get('ひとでなし');

    // Assert
    expect(effect).toBeInstanceOf(MercilessEffect);
  });

  describe('modifyCritRatio', () => {
    it.each([StatusCondition.Poison, StatusCondition.BadPoison])(
      '相手が %s なら、急所ランクを 3（必ず急所）にする',
      statusCondition => {
        // Arrange
        const { context, get } = createInMemoryBattle(
          { ability: 'ひとでなし' },
          { status: { statusCondition } },
        );

        // Act
        const result = new MercilessEffect().modifyCritRatio(get(1), 0, {
          ...context(),
          defender: get(2),
        });

        // Assert
        expect(result).toBe(3);
      },
    );

    it.each([null, StatusCondition.Burn, StatusCondition.Paralysis])(
      '相手が どく・もうどく でない（%s）なら、急所ランクを変えない',
      statusCondition => {
        // Arrange
        const { context, get } = createInMemoryBattle(
          { ability: 'ひとでなし' },
          { status: { statusCondition } },
        );

        // Act
        const result = new MercilessEffect().modifyCritRatio(get(1), 1, {
          ...context(),
          defender: get(2),
        });

        // Assert
        expect(result).toBeUndefined();
      },
    );

    it('相手がコンテキストにいなければ、急所ランクを変えない', () => {
      // Arrange
      const { get } = createInMemoryBattle({ ability: 'ひとでなし' }, {});

      // Act
      const result = new MercilessEffect().modifyCritRatio(get(1), 0);

      // Assert
      expect(result).toBeUndefined();
    });
  });
});
