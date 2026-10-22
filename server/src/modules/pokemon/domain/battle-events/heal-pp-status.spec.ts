import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonMove } from '@/modules/battle/domain/entities/battle-pokemon-move.entity';
import { AbilityRegistry } from '../abilities/ability-registry';
import { applyHeal, fractionOfMaxHp, isHealBlocked } from './heal';
import { applyDrainHeal } from './drain-heal';
import { reducePp } from './pp';
import {
  getEffectiveStatusCondition,
  isEffectivelyAsleep,
  resolveEffectiveStatusCondition,
} from './effective-status';
import { createInMemoryBattle } from './__tests__/in-memory-battle';

describe('回復・PP・状態異常として扱う状態の補助関数', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('applyHeal', () => {
    it('最大 HP を超えない範囲で回復し、回復した量を返す', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ status: { currentHp: 95 } });

      // Act
      const healed = await applyHeal(get(1), 10, context());

      // Assert
      expect(healed).toBe(5);
      expect(get(1).currentHp).toBe(100);
    });

    it('かいふくふうじ中は回復しない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        status: { currentHp: 50, volatileState: { healBlockTurns: 2 } },
      });

      // Act
      const healed = await applyHeal(get(1), 10, context());

      // Assert
      expect(isHealBlocked(get(1))).toBe(true);
      expect(healed).toBe(0);
      expect(get(1).currentHp).toBe(50);
    });

    it('ひんしのポケモンは回復しない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ status: { currentHp: 0 } });

      // Act
      const healed = await applyHeal(get(1), 10, context());

      // Assert
      expect(healed).toBe(0);
    });
  });

  it('吸収の回復も、かいふくふうじ中は回復しない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      status: { currentHp: 50, volatileState: { healBlockTurns: 2 } },
    });

    // Act
    const result = await applyDrainHeal(get(1), get(2), 10, context());

    // Assert
    expect(result).toEqual({ healed: 0, damaged: 0 });
  });

  it.each([
    [100, 8, 12],
    [100, 16, 6],
    [7, 16, 1],
  ])('最大 HP %s の 1/%s は %s（切り捨て、最低 1）', (maxHp, divisor, expected) => {
    // Arrange
    const { get } = createInMemoryBattle({ status: { maxHp, currentHp: maxHp } });

    // Act
    const amount = fractionOfMaxHp(get(1), divisor);

    // Assert
    expect(amount).toBe(expected);
  });

  describe('reducePp', () => {
    it('覚えている技の PP を減らし、減らした量を返す', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
        new BattlePokemonMove(7, 1, 33, 3, 10),
      ]);

      // Act
      const reduced = await reducePp(get(1), 33, 4, context());

      // Assert
      expect(reduced).toBe(3);
      expect(battleRepository.updateBattlePokemonMove).toHaveBeenCalledWith(7, { currentPp: 0 });
    });

    it('ものまねで入れ替わった技は、volatileState の PP を減らす', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle({
        status: {
          volatileState: {
            moveSlotOverrides: [{ battlePokemonMoveId: 7, moveId: 99, currentPp: 5, maxPp: 5 }],
          },
        },
      });
      battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
        new BattlePokemonMove(7, 1, 33, 3, 10),
      ]);

      // Act
      await reducePp(get(1), 99, 2, context());

      // Assert
      expect(get(1).volatileState.moveSlotOverrides).toEqual([
        { battlePokemonMoveId: 7, moveId: 99, currentPp: 3, maxPp: 5 },
      ]);
      expect(battleRepository.updateBattlePokemonMove).not.toHaveBeenCalled();
    });

    it('覚えていない技なら何もしない', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([]);

      // Act
      const reduced = await reducePp(get(1), 33, 4, context());

      // Assert
      expect(reduced).toBe(0);
    });
  });

  describe('状態異常として扱う状態', () => {
    it('状態異常があれば、その状態異常を返す', () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        status: { statusCondition: StatusCondition.Burn },
      });

      // Act
      const status = getEffectiveStatusCondition(get(1), context());

      // Assert
      expect(status).toBe(StatusCondition.Burn);
    });

    it('状態異常がなければ、コンテキストの attackerEffectiveStatus を返す（ぜったいねむり）', () => {
      // Arrange
      const { get, context } = createInMemoryBattle();

      // Act
      const asleep = isEffectivelyAsleep(
        get(1),
        context({ attacker: get(1), attackerEffectiveStatus: StatusCondition.Sleep }),
      );

      // Assert
      expect(asleep).toBe(true);
    });

    it('特性の treatedAsStatusCondition を引いて求める', async () => {
      // Arrange
      AbilityRegistry.register('テストぜったいねむり', {
        treatedAsStatusCondition: StatusCondition.Sleep,
      });
      const { get, context } = createInMemoryBattle({ ability: 'テストぜったいねむり' });

      // Act
      const status = await resolveEffectiveStatusCondition(get(1), context());

      // Assert
      expect(status).toBe(StatusCondition.Sleep);
    });

    it('どちらでもなければ null', () => {
      // Arrange
      const { get, context } = createInMemoryBattle();

      // Act
      const status = getEffectiveStatusCondition(get(1), context());

      // Assert
      expect(status).toBeNull();
    });
  });
});
