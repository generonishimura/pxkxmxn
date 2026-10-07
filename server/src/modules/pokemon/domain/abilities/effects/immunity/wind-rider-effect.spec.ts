import { WindRiderEffect } from './wind-rider-effect';
import { AbilityRegistry } from '../../ability-registry';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../../battle-context.interface';
import { MoveFlag } from '../../../moves/move-flags';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('WindRiderEffect（かぜのり）', () => {
  const pokemon = new BattlePokemonStatus(2, 1, 2, 2, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (
    flags: readonly MoveFlag[],
    category: 'Physical' | 'Special' | 'Status' = 'Special',
  ): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveCategory: category,
    moveFlags: new Set<MoveFlag>(flags),
  });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('isImmuneToMove', () => {
    it('風技の攻撃技（ぼうふうなど）を無効にする', () => {
      // Act
      const result = new WindRiderEffect().isImmuneToMove(pokemon, createCtx(['wind']));

      // Assert
      expect(result).toBe(true);
    });

    it('風技の変化技（ふきとばしなど）も無効にする', () => {
      // Act
      const result = new WindRiderEffect().isImmuneToMove(pokemon, createCtx(['wind'], 'Status'));

      // Assert
      expect(result).toBe(true);
    });

    it('風技でない技は無効にしない', () => {
      // Act
      const result = new WindRiderEffect().isImmuneToMove(pokemon, createCtx(['slicing']));

      // Assert
      expect(result).toBe(false);
    });

    it('battleContext がなければ無効にしない', () => {
      // Act
      const result = new WindRiderEffect().isImmuneToMove(pokemon, undefined);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('onMoveBlocked', () => {
    it('風技を無効にしたら攻撃を1段階上げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { ability: 'かぜのり' });

      // Act
      const message = await new WindRiderEffect().onMoveBlocked(
        get(2),
        context({ moveFlags: new Set<MoveFlag>(['wind']) }),
      );

      // Assert
      expect(get(2).attackRank).toBe(1);
      expect(message).toBe('Attack rose!');
    });

    it('攻撃ランクが+6なら上がらず、メッセージを出さない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'かぜのり', status: { attackRank: 6 } },
      );

      // Act
      const message = await new WindRiderEffect().onMoveBlocked(
        get(2),
        context({ moveFlags: new Set<MoveFlag>(['wind']) }),
      );

      // Assert
      expect(get(2).attackRank).toBe(6);
      expect(message).toBeNull();
    });

    it('battleContext がなければ何もしない', async () => {
      // Act
      const message = await new WindRiderEffect().onMoveBlocked(pokemon, undefined);

      // Assert
      expect(message).toBeNull();
    });
  });

  describe('onEntry', () => {
    it('自分の陣営においかぜが吹いている中で場に出たら、攻撃を1段階上げる', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle({}, { ability: 'かぜのり' });
      await battleRepository.patchSideConditions(1, 2, { tailwindTurns: 3 });

      // Act
      await new WindRiderEffect().onEntry(get(2), context());

      // Assert
      expect(get(2).attackRank).toBe(1);
    });

    it('相手の陣営にだけおいかぜが吹いているときは上げない', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle({}, { ability: 'かぜのり' });
      await battleRepository.patchSideConditions(1, 1, { tailwindTurns: 3 });

      // Act
      await new WindRiderEffect().onEntry(get(2), context());

      // Assert
      expect(get(2).attackRank).toBe(0);
    });

    it('おいかぜが吹いていなければ上げない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { ability: 'かぜのり' });

      // Act
      await new WindRiderEffect().onEntry(get(2), context());

      // Assert
      expect(get(2).attackRank).toBe(0);
    });
  });
});
