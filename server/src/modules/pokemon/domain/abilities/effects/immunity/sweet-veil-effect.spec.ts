import { SweetVeilEffect } from './sweet-veil-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

describe('SweetVeilEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const effect = new SweetVeilEffect();

  it('ねむりを無効化する', () => {
    // Act
    const result = effect.canReceiveStatusCondition(pokemon, StatusCondition.Sleep);

    // Assert
    expect(result).toBe(false);
  });

  it.each([
    StatusCondition.Burn,
    StatusCondition.Paralysis,
    StatusCondition.Poison,
    StatusCondition.Freeze,
  ])('ねむり以外の状態異常 %s は受ける', statusCondition => {
    // Act
    const result = effect.canReceiveStatusCondition(pokemon, statusCondition);

    // Assert
    expect(result).toBe(true);
  });
});
