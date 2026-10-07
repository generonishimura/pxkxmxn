import { BaseConfuseWithStatBoostEffect } from './base-confuse-with-stat-boost-effect';
import { StatType } from './base-stat-change-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

class TestSwaggerLike extends BaseConfuseWithStatBoostEffect {
  protected readonly statType: StatType = 'attack';
  protected readonly rankChange = 2;
}

class TestFlatterLike extends BaseConfuseWithStatBoostEffect {
  protected readonly statType: StatType = 'specialAttack';
  protected readonly rankChange = 1;
}

describe('BaseConfuseWithStatBoostEffect', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('Swagger 相当（Attack +2 + こんらん）', () => {
    it('攻撃を+2上げてこんらんを付与する', async () => {
      // Arrange
      const effect = new TestSwaggerLike();
      const { context, get } = createInMemoryBattle();

      // Act
      const result = await effect.onUse(get(1), get(2), context());

      // Assert
      expect(result).toBe('Attack rose! became confused!');
      expect(get(2).attackRank).toBe(2);
      expect(get(2).volatileState.confusionTurns).toBeGreaterThanOrEqual(2);
    });

    it('攻撃ランクが上限の場合はランク変化メッセージなしでこんらんのみ付与', async () => {
      // Arrange
      const effect = new TestSwaggerLike();
      const { context, get } = createInMemoryBattle({}, { status: { attackRank: 6 } });

      // Act
      const result = await effect.onUse(get(1), get(2), context());

      // Assert
      expect(result).toBe('became confused!');
      expect(get(2).volatileState.confusionTurns).toBeDefined();
    });

    it('状態異常があってもこんらんにする（こんらんは状態異常と同時に持てる）', async () => {
      // Arrange
      const effect = new TestSwaggerLike();
      const { context, get } = createInMemoryBattle(
        {},
        { status: { statusCondition: StatusCondition.Burn } },
      );

      // Act
      const result = await effect.onUse(get(1), get(2), context());

      // Assert
      expect(result).toBe('Attack rose! became confused!');
      expect(get(2).statusCondition).toBe(StatusCondition.Burn);
    });

    it('すでにこんらんしていれば能力上昇のみ実行', async () => {
      // Arrange
      const effect = new TestSwaggerLike();
      const { context, get } = createInMemoryBattle(
        {},
        { status: { volatileState: { confusionTurns: 3 } } },
      );

      // Act
      const result = await effect.onUse(get(1), get(2), context());

      // Assert
      expect(result).toBe('Attack rose!');
      expect(get(2).volatileState.confusionTurns).toBe(3);
    });

    it('マイペースの相手は、能力だけ上がってこんらんしない', async () => {
      // Arrange
      const effect = new TestSwaggerLike();
      const { context, get } = createInMemoryBattle({}, { ability: 'マイペース' });

      // Act
      const result = await effect.onUse(get(1), get(2), context());

      // Assert
      expect(result).toBe('Attack rose!');
      expect(get(2).volatileState.confusionTurns).toBeUndefined();
    });
  });

  describe('Flatter 相当（Special Attack +1 + こんらん）', () => {
    it('特攻を+1上げてこんらんを付与する', async () => {
      // Arrange
      const effect = new TestFlatterLike();
      const { context, get } = createInMemoryBattle();

      // Act
      const result = await effect.onUse(get(1), get(2), context());

      // Assert
      expect(result).toBe('Special Attack rose! became confused!');
      expect(get(2).specialAttackRank).toBe(1);
    });
  });

  it('battleRepository が無い場合は null', async () => {
    // Arrange
    const effect = new TestSwaggerLike();
    const { get } = createInMemoryBattle();
    const ctx: BattleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    };

    // Act
    const result = await effect.onUse(get(1), get(2), ctx);

    // Assert
    expect(result).toBeNull();
  });
});
