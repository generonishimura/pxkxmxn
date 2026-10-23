import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { BattleStatValues } from '../../abilities/battle-context.interface';
import { LightThatBurnsTheSkyEffect } from './light-that-burns-the-sky-effect';

describe('LightThatBurnsTheSkyEffect（てんこがすめつぼうのひかり）', () => {
  const categoryOf = (
    attackerStats: Partial<BattleStatValues> | undefined,
    attacker: Partial<BattlePokemonStatus> = {},
  ) => {
    const { context, get } = createInMemoryBattle({ status: attacker });
    return new LightThatBurnsTheSkyEffect().modifyMoveCategory(
      get(1),
      get(2),
      context({
        attackerStats: attackerStats && {
          attack: 100,
          defense: 100,
          specialAttack: 100,
          specialDefense: 100,
          speed: 100,
          ...attackerStats,
        },
      }),
    );
  };

  it('攻撃が特攻より高ければ、物理技になる', () => {
    // Act
    const category = categoryOf({ attack: 101 });

    // Assert
    expect(category).toBe('Physical');
  });

  it('攻撃と特攻が同じなら、特殊技のまま', () => {
    // Act
    const category = categoryOf({});

    // Assert
    expect(category).toBe('Special');
  });

  it('ランクを含めて比べる', () => {
    // Act
    const category = categoryOf({ specialAttack: 120 }, { attackRank: 1 });

    // Assert
    expect(category).toBe('Physical');
  });

  it('実数値が分からなければ、変えない', () => {
    // Act
    const category = categoryOf(undefined);

    // Assert
    expect(category).toBeUndefined();
  });
});
