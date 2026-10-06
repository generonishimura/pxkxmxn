import { PastelVeilEffect } from './pastel-veil-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

describe('PastelVeilEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const effect = new PastelVeilEffect();

  it.each([StatusCondition.Poison, StatusCondition.BadPoison])(
    'どく系の状態異常 %s を無効化する',
    statusCondition => {
      // Act
      const result = effect.canReceiveStatusCondition(pokemon, statusCondition);

      // Assert
      expect(result).toBe(false);
    },
  );

  it.each([StatusCondition.Burn, StatusCondition.Paralysis, StatusCondition.Sleep])(
    'どく系以外の状態異常 %s は受ける',
    statusCondition => {
      // Act
      const result = effect.canReceiveStatusCondition(pokemon, statusCondition);

      // Assert
      expect(result).toBe(true);
    },
  );
});
