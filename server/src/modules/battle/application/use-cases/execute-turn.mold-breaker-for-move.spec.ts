import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * 技によって相手の特性を無視する特性（breaksMoldFor。きんしのちから）と、同じ優先度の中の順番
 * （modifyFractionalPriority）をエンジン全体で確かめる
 * ポケモン 1 は素早さ種族値 150（速い）、ポケモン 2 は 100
 */
describe('ExecuteTurnUseCase - 変化技だけ相手の特性を無視する特性', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const THUNDER_WAVE = createTestMove(2, 'でんじは', {
    type: 'でんき',
    category: MoveCategory.Status,
  });
  const TACKLE = createTestMove(3, 'たいあたり', { power: 40 });
  const moves = [SPLASH, THUNDER_WAVE, TACKLE];

  const setup = (defenderAbility: string) =>
    createBattleEngine({
      moves,
      pokemon: [
        {
          id: 1,
          trainerId: 1,
          active: true,
          baseSpeed: 150,
          ability: 'テストのきんし',
          moveIds: [1, 2, 3],
        },
        { id: 2, trainerId: 2, active: true, ability: defenderAbility, moveIds: [1, 3] },
      ],
    });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
    AbilityRegistry.register('テストのきんし', {
      breaksMoldFor: ctx => ctx?.moveCategory === 'Status',
      modifyFractionalPriority: (_holder, ctx) =>
        ctx?.moveCategory === 'Status' ? -0.1 : undefined,
    });
  });

  it('変化技なら相手の特性を無視し、速くても同じ優先度の相手より後に動く', async () => {
    // Arrange
    const engine = setup('じゅうなん');

    // Act
    const result = await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: TACKLE.id });

    // Assert
    expect(result.actions.map(action => action.trainerId)).toEqual([2, 1]);
    expect(engine.status(2).statusCondition).toBe(StatusCondition.Paralysis);
  });

  it('攻撃技では相手の特性を無視しない（ふしぎなまもりでダメージを受けない）', async () => {
    // Arrange
    const engine = setup('ふしぎなまもり');

    // Act
    await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(2).currentHp).toBe(160);
  });
});
