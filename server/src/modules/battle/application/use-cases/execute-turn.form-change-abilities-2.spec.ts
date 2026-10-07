import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { resolveBattleAbilityName } from '@/modules/pokemon/domain/battle-events/battle-traits';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * はらぺこスイッチ・マイティチェンジ・テラスチェンジ（登録した特性の効果を、エンジン全体で動かす）
 */
describe('ExecuteTurnUseCase - はらぺこスイッチ・マイティチェンジ・テラスチェンジ', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const TACKLE = createTestMove(2, 'たいあたり');
  const MOVES = [SPLASH, TACKLE];

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
  });

  describe('はらぺこスイッチ', () => {
    it('ターン終了ごとに、はらぺこもようとまんぷくもようが入れ替わる', async () => {
      // Arrange
      const engine = createBattleEngine({
        moves: MOVES,
        pokemon: [
          {
            id: 1,
            trainerId: 1,
            active: true,
            moveIds: [SPLASH.id],
            nationalDex: 877,
            ability: 'はらぺこスイッチ',
          },
          { id: 2, trainerId: 2, active: true, moveIds: [SPLASH.id] },
        ],
      });

      // Act
      await engine.runTurn({ moveId: SPLASH.id }, { moveId: SPLASH.id });
      const afterFirstTurn = engine.status(1).volatileState.form;
      await engine.runTurn({ moveId: SPLASH.id }, { moveId: SPLASH.id });

      // Assert
      expect(afterFirstTurn).toBe('hangry');
      expect(engine.status(1).volatileState.form).toBeUndefined();
    });
  });

  describe('マイティチェンジ', () => {
    const setup = () =>
      createBattleEngine({
        moves: MOVES,
        pokemon: [
          {
            id: 1,
            trainerId: 1,
            active: true,
            moveIds: [TACKLE.id],
            nationalDex: 964,
            baseStats: [100, 70, 72, 53, 62, 100],
            ability: 'マイティチェンジ',
          },
          { id: 3, trainerId: 1, moveIds: [SPLASH.id] },
          { id: 2, trainerId: 2, active: true, moveIds: [SPLASH.id], baseSpeed: 50 },
        ],
      });

    it('引っ込むとマイティフォルムになり、また場に出てもマイティフォルムのまま', async () => {
      // Arrange
      const engine = setup();

      // Act
      await engine.runTurn({ switchPokemonId: 3 }, { moveId: SPLASH.id });
      const afterSwitchOut = engine.status(1).persistentState.form;
      await engine.runTurn({ switchPokemonId: 1 }, { moveId: SPLASH.id });

      // Assert
      expect(afterSwitchOut).toBe('hero');
      expect(engine.status(1).isActive).toBe(true);
      expect(engine.status(1).persistentState.form).toBe('hero');
    });

    it('マイティフォルムで場に出ると、攻撃の種族値 160 で計算した、より大きなダメージを与える', async () => {
      // Arrange
      const zero = setup();
      const hero = setup();
      await hero.runTurn({ switchPokemonId: 3 }, { moveId: SPLASH.id });
      await hero.runTurn({ switchPokemonId: 1 }, { moveId: SPLASH.id });
      const zeroHp = zero.status(2).currentHp;
      const heroHp = hero.status(2).currentHp;

      // Act
      await zero.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });
      await hero.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      const zeroDamage = zeroHp - zero.status(2).currentHp;
      const heroDamage = heroHp - hero.status(2).currentHp;
      expect(heroDamage).toBeGreaterThan(zeroDamage);
    });
  });

  describe('テラスチェンジ', () => {
    it('交代で場に出ると、テラスタルフォルムになり、特性がテラスシェルになる', async () => {
      // Arrange
      const engine = createBattleEngine({
        moves: MOVES,
        pokemon: [
          { id: 1, trainerId: 1, active: true, moveIds: [SPLASH.id] },
          {
            id: 3,
            trainerId: 1,
            moveIds: [SPLASH.id],
            nationalDex: 1024,
            baseStats: [90, 65, 85, 65, 85, 60],
            ability: 'テラスチェンジ',
            maxHp: 165,
          },
          { id: 2, trainerId: 2, active: true, moveIds: [SPLASH.id] },
        ],
      });

      // Act
      await engine.runTurn({ switchPokemonId: 3 }, { moveId: SPLASH.id });

      // Assert: HP の種族値が 90 → 95 になり、最大 HP は 165 → 170
      const terapagos = engine.status(3);
      const ctx: BattleContext = {
        battle: engine.battle(),
        battleRepository: engine.battleRepository,
        trainedPokemonRepository: engine.trainedPokemonRepository,
      };
      expect(terapagos.persistentState.form).toBe('terastal');
      expect(terapagos.maxHp).toBe(170);
      expect(await resolveBattleAbilityName(terapagos, ctx)).toBe('テラスシェル');
    });
  });
});
