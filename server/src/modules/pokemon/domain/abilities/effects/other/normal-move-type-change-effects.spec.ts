import { PixilateEffect } from './pixilate-effect';
import { AerilateEffect } from './aerilate-effect';
import { GalvanizeEffect } from './galvanize-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { IAbilityEffect } from '../../ability-effect.interface';

describe('-スキン系の特性（フェアリースキン・スカイスキン・エレキスキン）', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (overrides: Partial<BattleContext> = {}): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveName: 'たいあたり',
    ...overrides,
  });

  const cases: ReadonlyArray<readonly [string, IAbilityEffect, string]> = [
    ['フェアリースキン', new PixilateEffect(), 'フェアリー'],
    ['スカイスキン', new AerilateEffect(), 'ひこう'],
    ['エレキスキン', new GalvanizeEffect(), 'でんき'],
  ];

  describe.each(cases)('%s', (_name, effect, typeName) => {
    it(`ノーマル技のタイプを${typeName}にする`, () => {
      // Arrange
      const ctx = createCtx();

      // Act
      const result = effect.modifyMoveType?.(pokemon, 'ノーマル', ctx);

      // Assert
      expect(result).toBe(typeName);
    });

    it('ノーマル以外の技のタイプは変えない', () => {
      // Arrange
      const ctx = createCtx({ moveName: 'ひのこ' });

      // Act
      const result = effect.modifyMoveType?.(pokemon, 'ほのお', ctx);

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
    ])('タイプが決まる技（%s）は、ノーマルのままでも変えない', moveName => {
      // Arrange
      const ctx = createCtx({ moveName });

      // Act
      const result = effect.modifyMoveType?.(pokemon, 'ノーマル', ctx);

      // Assert
      expect(result).toBeUndefined();
    });

    it('特性がタイプを変えた技の威力を 1.2 倍（4915/4096）にする', () => {
      // Arrange
      const ctx = createCtx({ moveTypeChangedByAbility: true });

      // Act
      const result = effect.modifyBasePower?.(pokemon, 90, ctx);

      // Assert: 90 × 4915 / 4096 = 107.99… → 108
      expect(result).toBe(108);
    });

    it('特性がタイプを変えていない技の威力は変えない', () => {
      // Arrange
      const ctx = createCtx({ moveTypeChangedByAbility: false });

      // Act
      const result = effect.modifyBasePower?.(pokemon, 90, ctx);

      // Assert
      expect(result).toBeUndefined();
    });
  });
});
