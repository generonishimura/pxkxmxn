import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { MoldBreakerEffect } from '@/modules/pokemon/domain/abilities/effects/mold-breaker-effect';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import {
  ATTACKER_ID,
  DEFENDER_ID,
  createMove,
  setupMoveExecutor,
} from './__tests__/move-executor-test-setup';

describe('MoveExecutorService - 技を出す前の失敗判定', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('特性の preventsMove', () => {
    it('防御側特性が true を返すと、ダメージを与えずPPだけ消費して失敗する', async () => {
      // Arrange
      AbilityRegistry.register('テストしめりけ', { preventsMove: () => true });
      const { execute, calculate, checkHit, battleRepository } = setupMoveExecutor({
        defenderAbility: 'テストしめりけ',
      });

      // Act
      const message = await execute();

      // Assert
      expect(checkHit).not.toHaveBeenCalled();
      expect(calculate).not.toHaveBeenCalled();
      expect(battleRepository.updateBattlePokemonMove).toHaveBeenCalled();
      expect(message).toBe('Used ほのおのパンチ but it failed (テストしめりけ)');
    });

    it('攻撃側特性も role = attacker で呼ばれ、技を失敗させられる', async () => {
      // Arrange
      const preventsMove = jest.fn(
        (_holder: BattlePokemonStatus, role: 'attacker' | 'defender') => role === 'attacker',
      );
      AbilityRegistry.register('テストしめりけ', { preventsMove });
      const { execute, calculate } = setupMoveExecutor({ attackerAbility: 'テストしめりけ' });

      // Act
      const message = await execute();

      // Assert
      expect(preventsMove.mock.calls[0][0].id).toBe(ATTACKER_ID);
      expect(preventsMove.mock.calls[0][1]).toBe('attacker');
      expect(calculate).not.toHaveBeenCalled();
      expect(message).toContain('but it failed');
    });

    it('変化技でも呼ばれ、onUse を呼ばずに失敗する', async () => {
      // Arrange
      AbilityRegistry.register('テストじょおう', { preventsMove: () => true });
      const onUse = jest.fn().mockResolvedValue(null);
      const { execute } = setupMoveExecutor({
        defenderAbility: 'テストじょおう',
        move: createMove('でんじは', MoveCategory.Status, null),
        moveEffect: { onUse },
      });

      // Act
      await execute();

      // Assert
      expect(onUse).not.toHaveBeenCalled();
    });

    it('攻撃側がかたやぶりなら、防御側特性では失敗しない', async () => {
      // Arrange
      AbilityRegistry.register('テストしめりけ', { preventsMove: () => true });
      AbilityRegistry.register('テストかたやぶり', new MoldBreakerEffect());
      const { execute, calculate } = setupMoveExecutor({
        defenderAbility: 'テストしめりけ',
        attackerAbility: 'テストかたやぶり',
      });

      // Act
      await execute();

      // Assert
      expect(calculate).toHaveBeenCalled();
    });

    it('攻撃側特性の modifyPriority を反映した優先度を effectivePriority として渡す', async () => {
      // Arrange
      AbilityRegistry.register('テストいたずら', {
        modifyPriority: (_p, priority) => priority + 1,
      });
      const contexts: Array<BattleContext | undefined> = [];
      AbilityRegistry.register('テストじょおう', {
        preventsMove: (_holder, _role, ctx) => {
          contexts.push(ctx);
          return (ctx?.effectivePriority ?? 0) > 0;
        },
      });
      const { execute, calculate } = setupMoveExecutor({
        attackerAbility: 'テストいたずら',
        defenderAbility: 'テストじょおう',
      });

      // Act
      const message = await execute();

      // Assert
      expect(contexts[0]?.movePriority).toBe(0);
      expect(contexts[0]?.effectivePriority).toBe(1);
      expect(calculate).not.toHaveBeenCalled();
      expect(message).toContain('but it failed');
    });
  });

  describe('技の shouldFail', () => {
    it('true を返すと、命中判定の前にPPだけ消費して失敗する', async () => {
      // Arrange
      const { execute, calculate, checkHit, battleRepository } = setupMoveExecutor({
        move: createMove('ゆめくい', MoveCategory.Special, 100),
        moveEffect: {
          shouldFail: (_a, defender) => defender.statusCondition !== StatusCondition.Sleep,
        },
      });

      // Act
      const message = await execute();

      // Assert
      expect(checkHit).not.toHaveBeenCalled();
      expect(calculate).not.toHaveBeenCalled();
      expect(battleRepository.updateBattlePokemonMove).toHaveBeenCalled();
      expect(message).toBe('Used ゆめくい but it failed');
    });

    it('false を返すと、通常どおりダメージを与える', async () => {
      // Arrange
      const { execute, calculate } = setupMoveExecutor({
        move: createMove('ゆめくい', MoveCategory.Special, 100),
        defender: { statusCondition: StatusCondition.Sleep },
        moveEffect: {
          shouldFail: (_a, defender) => defender.statusCondition !== StatusCondition.Sleep,
        },
      });

      // Act
      await execute();

      // Assert
      expect(calculate).toHaveBeenCalled();
    });
  });

  describe('beforeDamage のあとの状態', () => {
    it('beforeDamage で変えたランクを、ダメージ計算に使う（シャドースチール）', async () => {
      // Arrange
      const { execute, calculate, battleRepository } = setupMoveExecutor({
        defender: { defenseRank: 2 },
        moveEffect: {
          beforeDamage: async () => {
            await battleRepository.updateBattlePokemonStatus(DEFENDER_ID, { defenseRank: 0 });
            await battleRepository.updateBattlePokemonStatus(ATTACKER_ID, { defenseRank: 2 });
          },
        },
      });

      // Act
      await execute();

      // Assert
      const params = calculate.mock.calls[0][0];
      expect(params.defender.defenseRank).toBe(0);
      expect(params.attacker.defenseRank).toBe(2);
      expect(params.battleContext?.attacker?.defenseRank).toBe(2);
    });
  });
});
