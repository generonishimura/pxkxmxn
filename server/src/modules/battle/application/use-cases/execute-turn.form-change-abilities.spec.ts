import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * フォルムを変える特性（バトルスイッチ・ダルマモード・リミットシールド・ぎょぐん）をエンジン全体で動かす
 * 威力 50 の物理技は、実数値 120 どうしでタイプ一致なしなら 24 ダメージ
 */
describe('ExecuteTurnUseCase - フォルムを変える特性', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const TACKLE = createTestMove(2, 'たいあたり');
  const THUNDER_WAVE = createTestMove(3, 'でんじは', {
    category: MoveCategory.Status,
    type: 'でんき',
  });
  const MOVES = [SPLASH, TACKLE, THUNDER_WAVE];
  const MOVE_IDS = MOVES.map(move => move.id);

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
  });

  it('バトルスイッチのギルガルドは、攻撃技をブレードフォルムの攻撃で当てる', async () => {
    // Arrange
    const engine = createBattleEngine({
      moves: MOVES,
      pokemon: [
        {
          id: 1,
          trainerId: 1,
          active: true,
          moveIds: MOVE_IDS,
          ability: 'バトルスイッチ',
          nationalDex: 681,
          types: ['はがね', 'ゴースト'],
          baseStats: [60, 50, 140, 50, 140, 60],
        },
        { id: 2, trainerId: 2, active: true, moveIds: MOVE_IDS, baseSpeed: 50 },
      ],
    });

    // Act
    const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

    // Assert: ブレードフォルムの攻撃 160 → 31 ダメージ（シールドフォルムなら 14）
    expect(engine.status(1).volatileState.form).toBe('blade');
    expect(engine.status(2).currentHp).toBe(160 - 31);
    expect(result.actions[0].result).toContain('changed to Blade Forme!');
  });

  it('ダルマモードのヒヒダルマは、ターン終了時に HP が半分以下ならダルマモードになる', async () => {
    // Arrange
    const engine = createBattleEngine({
      moves: MOVES,
      pokemon: [
        {
          id: 1,
          trainerId: 1,
          active: true,
          moveIds: MOVE_IDS,
          ability: 'ダルマモード',
          nationalDex: 555,
          types: ['ほのお'],
          currentHp: 80,
        },
        { id: 2, trainerId: 2, active: true, moveIds: MOVE_IDS, baseSpeed: 50 },
      ],
    });

    // Act
    await engine.runTurn({ moveId: SPLASH.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(1).volatileState.form).toBe('zen');
  });

  it('リミットシールドのメテノは、場に出てりゅうせいのすがたになったあと、でんじはでまひにならない', async () => {
    // Arrange
    const engine = createBattleEngine({
      moves: MOVES,
      pokemon: [
        { id: 1, trainerId: 1, active: true, moveIds: MOVE_IDS },
        { id: 2, trainerId: 2, active: true, moveIds: MOVE_IDS, baseSpeed: 50 },
        {
          id: 3,
          trainerId: 2,
          moveIds: MOVE_IDS,
          baseSpeed: 50,
          ability: 'リミットシールド',
          nationalDex: 774,
          types: ['いわ', 'ひこう'],
        },
      ],
    });
    await engine.runTurn({ moveId: SPLASH.id }, { switchPokemonId: 3 });

    // Act
    await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(3).volatileState.form).toBe('meteor');
    expect(engine.status(3).statusCondition).toBe(StatusCondition.None);
  });

  it('ぎょぐんのヨワシは、交代で場に出たときに HP が 1/4 より上ならむれたすがたになる', async () => {
    // Arrange
    const engine = createBattleEngine({
      moves: MOVES,
      pokemon: [
        { id: 1, trainerId: 1, active: true, moveIds: MOVE_IDS },
        { id: 3, trainerId: 1, moveIds: MOVE_IDS, ability: 'ぎょぐん', nationalDex: 746 },
        { id: 2, trainerId: 2, active: true, moveIds: MOVE_IDS, baseSpeed: 50 },
      ],
    });

    // Act
    await engine.runTurn({ switchPokemonId: 3 }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(3).volatileState.form).toBe('school');
  });
});
