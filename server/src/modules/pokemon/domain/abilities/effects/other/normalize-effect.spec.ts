import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../../battle-context.interface';
import { NormalizeEffect } from './normalize-effect';

describe('NormalizeEffect（ノーマルスキン）', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const createCtx = (data: Partial<BattleContext> = {}): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    ...data,
  });

  describe('modifyMoveType', () => {
    it('ノーマル以外の技をノーマルにする', () => {
      // Act
      const result = new NormalizeEffect().modifyMoveType(
        pokemon,
        'ほのお',
        createCtx({ moveName: 'かえんほうしゃ' }),
      );

      // Assert
      expect(result).toBe('ノーマル');
    });

    it('もとからノーマルの技も、ノーマルを返す（1.2 倍になる）', () => {
      // Act
      const result = new NormalizeEffect().modifyMoveType(
        pokemon,
        'ノーマル',
        createCtx({ moveName: 'すてみタックル' }),
      );

      // Assert
      expect(result).toBe('ノーマル');
    });

    it.each([
      'ウェザーボール',
      'テクノバスター',
      'さばきのつぶて',
      'マルチアタック',
      'めざめるダンス',
      'しぜんのめぐみ',
      'だいちのはどう',
      'めざめるパワー',
    ])('%s のタイプは変えない', moveName => {
      // Act
      const result = new NormalizeEffect().modifyMoveType(
        pokemon,
        'ほのお',
        createCtx({ moveName }),
      );

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('modifyBasePower', () => {
    it('特性でタイプを変えた技の威力を 1.2 倍（4915/4096）にする', () => {
      // Act
      const result = new NormalizeEffect().modifyBasePower(
        pokemon,
        90,
        createCtx({ moveTypeChangedByAbility: true }),
      );

      // Assert: 90 × 4915 / 4096 = 107.99… → 108
      expect(result).toBe(108);
    });

    it('特性でタイプを変えていない技の威力は変えない', () => {
      // Act
      const result = new NormalizeEffect().modifyBasePower(
        pokemon,
        90,
        createCtx({ moveTypeChangedByAbility: false }),
      );

      // Assert
      expect(result).toBeUndefined();
    });
  });
});
