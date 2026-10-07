import { UnseenFistEffect } from './unseen-fist-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { MoveFlags } from '@/modules/pokemon/domain/moves/move-flags';

describe('UnseenFistEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);

  let effect: UnseenFistEffect;

  beforeEach(() => {
    effect = new UnseenFistEffect();
  });

  it('接触技なら、まもる系を通り抜ける', () => {
    // Arrange
    const ctx: BattleContext = {
      battle,
      moveName: 'あんこくきょうだ',
      moveCategory: 'Physical',
      moveFlags: MoveFlags.get('あんこくきょうだ'),
    };

    // Act
    const result = effect.bypassesProtection(pokemon, ctx);

    // Assert
    expect(result).toBe(true);
  });

  it('接触しない物理技では、まもる系を通り抜けない', () => {
    // Arrange
    const ctx: BattleContext = {
      battle,
      moveName: 'じしん',
      moveCategory: 'Physical',
      moveFlags: MoveFlags.get('じしん'),
    };

    // Act
    const result = effect.bypassesProtection(pokemon, ctx);

    // Assert
    expect(result).toBe(false);
  });

  it('特殊技では、まもる系を通り抜けない', () => {
    // Arrange
    const ctx: BattleContext = {
      battle,
      moveName: 'みずでっぽう',
      moveCategory: 'Special',
      moveFlags: MoveFlags.get('みずでっぽう'),
    };

    // Act
    const result = effect.bypassesProtection(pokemon, ctx);

    // Assert
    expect(result).toBe(false);
  });

  it('技の情報がなければ、まもる系を通り抜けない', () => {
    // Act
    const result = effect.bypassesProtection(pokemon);

    // Assert
    expect(result).toBe(false);
  });
});
