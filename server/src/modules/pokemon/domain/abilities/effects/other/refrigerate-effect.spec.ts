import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../../battle-context.interface';
import { RefrigerateEffect } from './refrigerate-effect';

describe('RefrigerateEffect（フリーズスキン）', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const createCtx = (data: Partial<BattleContext> = {}): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    ...data,
  });

  describe('modifyMoveType', () => {
    it('ノーマル技をこおり技にする', () => {
      // Act
      const result = new RefrigerateEffect().modifyMoveType(
        pokemon,
        'ノーマル',
        createCtx({ moveName: 'すてみタックル' }),
      );

      // Assert
      expect(result).toBe('こおり');
    });

    it('ノーマル以外の技のタイプは変えない', () => {
      // Act
      const result = new RefrigerateEffect().modifyMoveType(
        pokemon,
        'ほのお',
        createCtx({ moveName: 'かえんほうしゃ' }),
      );

      // Assert
      expect(result).toBeUndefined();
    });

    it.each([
      'ウェザーボール',
      'テクノバスター',
      'さばきのつぶて',
      'マルチアタック',
      'めざめるダンス',
      'しぜんのめぐみ',
      'だいちのはどう',
    ])('ノーマルタイプの %s は変えない', moveName => {
      // Act
      const result = new RefrigerateEffect().modifyMoveType(
        pokemon,
        'ノーマル',
        createCtx({ moveName }),
      );

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('modifyBasePower', () => {
    it('特性でタイプを変えた技の威力を 1.2 倍（4915/4096）にする', () => {
      // Act
      const result = new RefrigerateEffect().modifyBasePower(
        pokemon,
        120,
        createCtx({ moveTypeChangedByAbility: true }),
      );

      // Assert: 120 × 4915 / 4096 = 143.99… → 144
      expect(result).toBe(144);
    });

    it('特性でタイプを変えていない技の威力は変えない', () => {
      // Act
      const result = new RefrigerateEffect().modifyBasePower(pokemon, 120, createCtx());

      // Assert
      expect(result).toBeUndefined();
    });
  });
});
