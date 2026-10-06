import { LongReachEffect } from './long-reach-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { MoveFlags, isContactMove } from '@/modules/pokemon/domain/moves/move-flags';

describe('LongReachEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const ctx: BattleContext = {
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveCategory: 'Physical',
  };

  let effect: LongReachEffect;

  beforeEach(() => {
    effect = new LongReachEffect();
  });

  it('接触技から contact フラグを外す', () => {
    // Arrange
    const flags = MoveFlags.get('かみなりパンチ');

    // Act
    const result = effect.modifyMoveFlags(pokemon, flags);

    // Assert
    expect(result.has('contact')).toBe(false);
  });

  it('contact 以外のフラグは残す', () => {
    // Arrange
    const flags = MoveFlags.get('かみなりパンチ');

    // Act
    const result = effect.modifyMoveFlags(pokemon, flags);

    // Assert
    expect(result.has('punch')).toBe(true);
  });

  it('外したあとのフラグでは物理技でも接触技と判定されない', () => {
    // Arrange
    const flags = effect.modifyMoveFlags(pokemon, MoveFlags.get('たいあたり'));

    // Act
    const result = isContactMove({ ...ctx, moveFlags: flags });

    // Assert
    expect(result).toBe(false);
  });

  it('技フラグ表の元のフラグは書き換えない', () => {
    // Arrange
    const flags = MoveFlags.get('たいあたり');

    // Act
    effect.modifyMoveFlags(pokemon, flags);

    // Assert
    expect(MoveFlags.has('たいあたり', 'contact')).toBe(true);
  });
});
