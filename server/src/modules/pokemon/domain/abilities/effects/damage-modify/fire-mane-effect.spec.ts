import { FireManeEffect } from './fire-mane-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('FireManeEffect（Fire Mane）', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const ctxOf = (moveTypeName: string): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveTypeName,
  });

  it('ほのおタイプの技のダメージを 1.5 倍にする', () => {
    // Act
    const result = new FireManeEffect().modifyDamageDealt(pokemon, 100, ctxOf('ほのお'));

    // Assert
    expect(result).toBe(150);
  });

  it('ほのお以外のタイプの技のダメージは変えない', () => {
    // Act
    const result = new FireManeEffect().modifyDamageDealt(pokemon, 100, ctxOf('ノーマル'));

    // Assert
    expect(result).toBeUndefined();
  });
});
