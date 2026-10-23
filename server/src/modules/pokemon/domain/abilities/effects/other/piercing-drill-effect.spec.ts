import { PiercingDrillEffect } from './piercing-drill-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { MoveFlags } from '@/modules/pokemon/domain/moves/move-flags';

describe('PiercingDrillEffect（かんつうドリル）', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);

  const ctxOf = (moveName: string, moveCategory: BattleContext['moveCategory']): BattleContext => ({
    battle,
    moveName,
    moveCategory,
    moveFlags: MoveFlags.get(moveName),
  });

  it('接触技なら、まもる系を通り抜ける', () => {
    // Act
    const result = new PiercingDrillEffect().bypassesProtection(
      pokemon,
      ctxOf('ドリルライナー', 'Physical'),
    );

    // Assert
    expect(result).toBe(true);
  });

  it('接触しない物理技では、まもる系を通り抜けない', () => {
    // Act
    const result = new PiercingDrillEffect().bypassesProtection(
      pokemon,
      ctxOf('じしん', 'Physical'),
    );

    // Assert
    expect(result).toBe(false);
  });

  it('技の情報がなければ、まもる系を通り抜けない', () => {
    // Act
    const result = new PiercingDrillEffect().bypassesProtection(pokemon);

    // Assert
    expect(result).toBe(false);
  });
});
