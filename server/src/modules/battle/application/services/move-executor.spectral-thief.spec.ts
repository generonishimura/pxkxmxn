import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { Move, MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { SpectralThiefEffect } from '@/modules/pokemon/domain/moves/effects/spectral-thief-effect';
import {
  ATTACKER_ID,
  DEFENDER_ID,
  NORMAL,
  setupMoveExecutor,
} from './__tests__/move-executor-test-setup';

/**
 * シャドースチールを技の実行の流れで確かめる（ランクを奪う → 奪ったランクでダメージ計算 → メッセージ）
 */
describe('MoveExecutorService - シャドースチール', () => {
  const GHOST = new Type(8, 'ゴースト', 'Ghost');
  const spectralThief = new Move(
    1,
    'シャドースチール',
    'Spectral Thief',
    GHOST,
    MoveCategory.Physical,
    90,
    100,
    10,
    0,
    null,
  );

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('奪ったあとのランクでダメージを計算し、奪ったことをメッセージに出す', async () => {
    // Arrange
    const { execute, statuses, calculate } = setupMoveExecutor({
      move: spectralThief,
      moveEffect: new SpectralThiefEffect(),
      defender: { attackRank: 1, defenseRank: 2 },
      damage: 30,
    });

    // Act
    const message = await execute();

    // Assert
    const params = calculate.mock.calls[0][0];
    expect(params.attacker.attackRank).toBe(1);
    expect(params.defender.defenseRank).toBe(0);
    expect(statuses.get(ATTACKER_ID)?.defenseRank).toBe(2);
    expect(statuses.get(DEFENDER_ID)?.attackRank).toBe(0);
    expect(message).toBe(
      "Used シャドースチール and dealt 30 damage Stole the target's stat boosts! Attack rose! Defense rose!",
    );
  });

  it('ノーマルタイプの相手からはランクを奪わない', async () => {
    // Arrange
    const { execute, statuses, typeEffectivenessRepository } = setupMoveExecutor({
      move: spectralThief,
      moveEffect: new SpectralThiefEffect(),
      defender: { defenseRank: 2 },
    });
    typeEffectivenessRepository.getTypeEffectivenessMap.mockResolvedValue(
      new Map([[`${GHOST.id}-${NORMAL.id}`, 0]]),
    );

    // Act
    await execute();

    // Assert
    expect(statuses.get(DEFENDER_ID)?.defenseRank).toBe(2);
    expect(statuses.get(ATTACKER_ID)?.defenseRank).toBe(0);
  });
});
