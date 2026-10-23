import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { IMoveEffect } from '@/modules/pokemon/domain/moves/move-effect.interface';
import { setupMoveExecutor } from './__tests__/move-executor-test-setup';

describe('MoveExecutorService - 技の modifyPriority と effectivePriority（グラススライダー）', () => {
  const capturePriority = () => {
    const priorities: Array<number | undefined> = [];
    AbilityRegistry.register('テストじょおうのいげん', {
      preventsMove: (_holder, role, ctx?: BattleContext) => {
        if (role === 'defender') {
          priorities.push(ctx?.effectivePriority);
        }
        return false;
      },
    });
    return priorities;
  };

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('技の modifyPriority が返した優先度を effectivePriority にする（じょおうのいげんなどが読む）', async () => {
    // Arrange
    const priorities = capturePriority();
    const moveEffect: IMoveEffect = { modifyPriority: (_p, priority) => priority + 1 };
    const { execute } = setupMoveExecutor({
      moveEffect,
      defenderAbility: 'テストじょおうのいげん',
    });

    // Act
    await execute();

    // Assert
    expect(priorities).toEqual([1]);
  });

  it('使用者の特性の modifyPriority には、技が変えたあとの優先度を渡す', async () => {
    // Arrange
    const priorities = capturePriority();
    AbilityRegistry.register('テストいたずらごころ', {
      modifyPriority: (_p, priority) => priority + 1,
    });
    const moveEffect: IMoveEffect = { modifyPriority: (_p, priority) => priority + 1 };
    const { execute } = setupMoveExecutor({
      moveEffect,
      attackerAbility: 'テストいたずらごころ',
      defenderAbility: 'テストじょおうのいげん',
    });

    // Act
    await execute();

    // Assert
    expect(priorities).toEqual([2]);
  });
});
