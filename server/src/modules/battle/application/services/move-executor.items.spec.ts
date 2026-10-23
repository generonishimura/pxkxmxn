import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { ItemRegistry } from '@/modules/pokemon/domain/items/item-registry';
import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import {
  ATTACKER_ID,
  DEFENDER_ID,
  createMove,
  setupMoveExecutor,
} from './__tests__/move-executor-test-setup';

describe('MoveExecutorService - 持ち物の onUpdate', () => {
  const twoHits = {
    beforeDamage: async (
      _a: BattlePokemonStatus,
      _d: BattlePokemonStatus,
      _m: unknown,
      ctx: { multiHitCount?: number },
    ) => {
      ctx.multiHitCount = 2;
    },
  };

  /** HP が半分以下なら 20 回復して使い切る、テスト用のきのみ */
  const registerHalfHpBerry = (name: string) =>
    ItemRegistry.register(name, {
      onUpdate: async (holder, ctx) => {
        if (holder.currentHp > holder.maxHp / 2) {
          return null;
        }
        await ctx.battleRepository?.updateBattlePokemonStatus(holder.id, {
          currentHp: holder.currentHp + 20,
        });
        await ctx.battleRepository?.patchPersistentState(holder.id, { item: null });
        return `${name} restored HP!`;
      },
    });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    ItemRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    ItemRegistry.initialize();
  });

  it('ヒットのあとに防御側の持ち物の onUpdate を呼び、メッセージを技の結果に入れる', async () => {
    // Arrange
    registerHalfHpBerry('テストのきのみ');
    const { execute, statuses } = setupMoveExecutor({
      defender: { persistentState: { item: 'テストのきのみ' } },
      damage: 60,
    });

    // Act
    const message = await execute();

    // Assert
    expect(statuses.get(DEFENDER_ID)?.currentHp).toBe(60);
    expect(message).toContain('テストのきのみ restored HP!');
  });

  it('連続技では、ヒットの間に持ち物が働き、次のヒットは働いたあとの HP に当たる', async () => {
    // Arrange: 100 → 45（きのみで 65）→ 35
    registerHalfHpBerry('テストのきのみ');
    const { execute, statuses, calculate } = setupMoveExecutor({
      defender: { persistentState: { item: 'テストのきのみ' } },
      moveEffect: twoHits,
      damage: [55, 30],
    });

    // Act
    await execute();

    // Assert
    expect(calculate.mock.calls[1][0].defender.currentHp).toBe(65);
    expect(statuses.get(DEFENDER_ID)?.currentHp).toBe(35);
  });

  it('ヒットでひんしになったら、防御側の持ち物は働かない', async () => {
    // Arrange
    const onUpdate = jest.fn().mockResolvedValue(null);
    ItemRegistry.register('テストのきのみ', { onUpdate });
    const { execute } = setupMoveExecutor({
      defender: { persistentState: { item: 'テストのきのみ' } },
      damage: 200,
    });

    // Act
    await execute();

    // Assert
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('ヒットのあとに、攻撃側の持ち物の onUpdate も呼ぶ（ゴツゴツメット・さめはだのダメージのあと）', async () => {
    // Arrange
    const onUpdate = jest.fn().mockResolvedValue(null);
    ItemRegistry.register('テストのきのみ', { onUpdate });
    const { execute } = setupMoveExecutor({
      attacker: { persistentState: { item: 'テストのきのみ' } },
      damage: 30,
    });

    // Act
    await execute();

    // Assert: ヒットのあとと、技を出し終えたときの 2 回
    expect(onUpdate).toHaveBeenCalledTimes(2);
    expect(onUpdate.mock.calls[0][0].id).toBe(ATTACKER_ID);
  });

  it('変化技を出し終えたあとに、相手の持ち物の onUpdate を呼ぶ（ちょうはつのあとのメンタルハーブ）', async () => {
    // Arrange
    ItemRegistry.register('テストのハーブ', {
      onUpdate: async holder =>
        holder.volatileState.tauntTurns !== undefined ? 'テストのハーブ cured taunt!' : null,
    });
    const { execute } = setupMoveExecutor({
      move: createMove('ちょうはつ', MoveCategory.Status, null),
      moveEffect: {
        onUse: async (_attacker, defender, ctx) => {
          await ctx.battleRepository?.patchVolatileState(defender.id, { tauntTurns: 3 });
          return null;
        },
      },
      defender: { persistentState: { item: 'テストのハーブ' } },
    });

    // Act
    const message = await execute();

    // Assert
    expect(message).toContain('テストのハーブ cured taunt!');
  });

  it('技を出し終えたあとに、技を出したポケモンの持ち物の onUpdate を呼ぶ（ねむるのあとのカゴのみ）', async () => {
    // Arrange
    ItemRegistry.register('テストのきのみ', {
      onUpdate: async holder =>
        holder.statusCondition === StatusCondition.Sleep ? 'テストのきのみ woke it up!' : null,
    });
    const { execute } = setupMoveExecutor({
      move: createMove('ねむる', MoveCategory.Status, null),
      moveEffect: {
        onUse: async (attacker, _defender, ctx) => {
          await ctx.battleRepository?.updateBattlePokemonStatus(attacker.id, {
            statusCondition: StatusCondition.Sleep,
          });
          return null;
        },
      },
      attacker: { persistentState: { item: 'テストのきのみ' } },
    });

    // Act
    const message = await execute();

    // Assert
    expect(message).toContain('テストのきのみ woke it up!');
  });

  it('技を出せなかったとき（ねむりで動けないなど）も、技を出したポケモンの持ち物の onUpdate を呼ぶ', async () => {
    // Arrange
    const onUpdate = jest.fn().mockResolvedValue(null);
    ItemRegistry.register('テストのきのみ', { onUpdate });
    const { execute } = setupMoveExecutor({
      attacker: {
        statusCondition: StatusCondition.Sleep,
        persistentState: { item: 'テストのきのみ', sleepTurns: 2 },
      },
    });

    // Act
    await execute();

    // Assert
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate.mock.calls[0][0].id).toBe(ATTACKER_ID);
  });

  describe('BattleContext.bypassesSubstitute', () => {
    const captureContext = () => {
      const contexts: BattleContext[] = [];
      ItemRegistry.register('テストの記録', {
        modifyDamage: (_holder, damage, ctx) => {
          if (ctx) {
            contexts.push(ctx);
          }
          return damage;
        },
      });
      return contexts;
    };

    it('ダメージ計算のコンテキストに、みがわりを無視しない技なら false が入る', async () => {
      // Arrange
      const contexts = captureContext();
      const { execute, calculate } = setupMoveExecutor({
        defender: { persistentState: { item: 'テストの記録' } },
      });
      calculate.mockRestore();

      // Act
      await execute();

      // Assert
      expect(contexts[0]?.bypassesSubstitute).toBe(false);
    });

    it('すりぬけの攻撃側なら true が入る', async () => {
      // Arrange
      AbilityRegistry.register('テストすりぬけ', { infiltrates: true });
      const contexts = captureContext();
      const { execute, calculate } = setupMoveExecutor({
        attackerAbility: 'テストすりぬけ',
        defender: { persistentState: { item: 'テストの記録' } },
      });
      calculate.mockRestore();

      // Act
      await execute();

      // Assert
      expect(contexts[0]?.bypassesSubstitute).toBe(true);
    });
  });
});
