import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { ToxicEffect } from '@/modules/pokemon/domain/moves/effects/toxic-effect';
import { ThunderWaveEffect } from '@/modules/pokemon/domain/moves/effects/thunder-wave-effect';
import { tryInflictStatus } from '@/modules/pokemon/domain/battle-events/status-infliction';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import {
  ATTACKER_ID,
  DEFENDER_ID,
  createMove,
  createTrainedPokemon,
  setupMoveExecutor,
} from './__tests__/move-executor-test-setup';

/**
 * 変化技で状態異常を付与する技（どくどく・でんじはなど）が、技の実行で状態異常を付与するかを確かめる
 */
describe('MoveExecutorService - 状態異常を付与する変化技', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('どくどくで相手をもうどくにする', async () => {
    // Arrange
    const { execute, statuses } = setupMoveExecutor({
      move: createMove('どくどく', MoveCategory.Status, null),
      moveEffect: new ToxicEffect(),
    });

    // Act
    const message = await execute();

    // Assert
    expect(statuses.get(DEFENDER_ID)?.statusCondition).toBe(StatusCondition.BadPoison);
    expect(message).toBe('Used どくどく was badly poisoned!');
  });

  it('使用者の特性がタイプの免疫を無視する（ふしょく）なら、どくどくではがねタイプをもうどくにする', async () => {
    // Arrange
    AbilityRegistry.register('テストふしょく', { bypassesStatusTypeImmunity: () => true });
    const { execute, statuses, trainedPokemons } = setupMoveExecutor({
      move: createMove('どくどく', MoveCategory.Status, null),
      moveEffect: new ToxicEffect(),
      attackerAbility: 'テストふしょく',
    });
    trainedPokemons.set(
      DEFENDER_ID,
      createTrainedPokemon(DEFENDER_ID, undefined, { primary: new Type(9, 'はがね', 'Steel') }),
    );

    // Act
    await execute();

    // Assert
    expect(statuses.get(DEFENDER_ID)?.statusCondition).toBe(StatusCondition.BadPoison);
  });

  it('でんじはでまひにした相手の特性が付与し返す（シンクロ）なら、使用者もまひになる', async () => {
    // Arrange
    AbilityRegistry.register('テストシンクロ', {
      onStatusInflicted: async (holder, status, source, ctx) => {
        if (!ctx || !source?.pokemon || source.pokemon.id === holder.id) return null;
        const { inflicted } = await tryInflictStatus(source.pokemon, status, ctx, {
          source: { pokemon: holder, kind: 'ability', name: 'テストシンクロ' },
        });
        return inflicted ? 'Synchronize activated!' : null;
      },
    });
    const { execute, statuses } = setupMoveExecutor({
      move: createMove('でんじは', MoveCategory.Status, null),
      moveEffect: new ThunderWaveEffect(),
      defenderAbility: 'テストシンクロ',
    });

    // Act
    const message = await execute();

    // Assert
    expect(statuses.get(DEFENDER_ID)?.statusCondition).toBe(StatusCondition.Paralysis);
    expect(statuses.get(ATTACKER_ID)?.statusCondition).toBe(StatusCondition.Paralysis);
    expect(message).toBe('Used でんじは was paralyzed! Synchronize activated!');
  });

  it('でんじははじめんタイプをまひにしない', async () => {
    // Arrange
    const { execute, statuses, trainedPokemons } = setupMoveExecutor({
      move: createMove('でんじは', MoveCategory.Status, null),
      moveEffect: new ThunderWaveEffect(),
    });
    trainedPokemons.set(
      DEFENDER_ID,
      createTrainedPokemon(DEFENDER_ID, undefined, { primary: new Type(5, 'じめん', 'Ground') }),
    );

    // Act
    const message = await execute();

    // Assert
    expect(statuses.get(DEFENDER_ID)?.statusCondition).toBeNull();
    expect(message).toBe('Used でんじは');
  });
});
