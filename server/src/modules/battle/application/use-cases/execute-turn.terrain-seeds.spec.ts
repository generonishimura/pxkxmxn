import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { ItemRegistry } from '@/modules/pokemon/domain/items/item-registry';
import { Field } from '../../domain/entities/battle.entity';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * フィールドで能力が上がるシード（エレキシード・グラスシード・ミストシード・サイコシード）（エンジン全体）
 * トレーナー 1 は場のポケモン 1 から控えのポケモン 3 に交代する
 */
describe('ExecuteTurnUseCase - フィールドで能力が上がるシード', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const ELECTRIC_TERRAIN = createTestMove(2, 'エレキフィールド', {
    category: MoveCategory.Status,
  });

  const setup = (options: { item: string; field?: Field; holderOnField?: boolean }) =>
    createBattleEngine({
      moves: [SPLASH, ELECTRIC_TERRAIN],
      field: options.field ?? null,
      pokemon: [
        { id: 1, trainerId: 1, active: true, moveIds: [1, 2] },
        {
          id: 3,
          trainerId: 1,
          moveIds: [1],
          persistentState: options.holderOnField ? {} : { item: options.item },
        },
        {
          id: 2,
          trainerId: 2,
          active: true,
          moveIds: [1],
          persistentState: options.holderOnField ? { item: options.item } : {},
        },
      ],
    });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
    ItemRegistry.initialize();
  });

  it.each([
    ['エレキシード', Field.ElectricTerrain, 'defenseRank'],
    ['グラスシード', Field.GrassyTerrain, 'defenseRank'],
    ['ミストシード', Field.MistyTerrain, 'specialDefenseRank'],
    ['サイコシード', Field.PsychicTerrain, 'specialDefenseRank'],
  ] as const)(
    '%s は、%s の場に出ると能力が 1 段階上がり、なくなる',
    async (item, field, rankKey) => {
      // Arrange
      const engine = setup({ item, field });

      // Act
      await engine.runTurn({ switchPokemonId: 3 }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(3)[rankKey]).toBe(1);
      expect(engine.status(3).persistentState.item).toBeUndefined();
      expect(engine.status(3).persistentState.consumedItem).toBe(item);
    },
  );

  it('フィールドが合わなければ、場に出ても使わない', async () => {
    // Arrange
    const engine = setup({ item: 'エレキシード', field: Field.GrassyTerrain });

    // Act
    await engine.runTurn({ switchPokemonId: 3 }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(3).defenseRank).toBe(0);
    expect(engine.status(3).persistentState.item).toBe('エレキシード');
  });

  it('場にいる間に合うフィールドになると、能力が上がり、なくなる', async () => {
    // Arrange
    const engine = setup({ item: 'エレキシード', holderOnField: true });

    // Act
    await engine.runTurn({ moveId: ELECTRIC_TERRAIN.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(2).defenseRank).toBe(1);
    expect(engine.status(2).persistentState.item).toBeUndefined();
  });
});
