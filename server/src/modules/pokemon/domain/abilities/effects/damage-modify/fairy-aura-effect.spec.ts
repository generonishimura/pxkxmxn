import { FairyAuraEffect } from './fairy-aura-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('FairyAuraEffect', () => {
  const holder = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);

  const createCtx = (overrides?: Partial<BattleContext>): BattleContext => ({
    battle,
    moveTypeName: 'フェアリー',
    moveCategory: 'Special',
    attackerAbilityName: 'フェアリーオーラ',
    defenderAbilityName: 'いかく',
    ...overrides,
  });

  let effect: FairyAuraEffect;

  beforeEach(() => {
    effect = new FairyAuraEffect();
  });

  describe('modifyAnyBasePower', () => {
    it('フェアリー技の威力を 5448/4096 倍にする', () => {
      // Act
      const result = effect.modifyAnyBasePower(holder, 100, createCtx());

      // Assert
      expect(result).toBe(133);
    });

    it('相手が使ったフェアリー技の威力も上げる', () => {
      // Arrange
      const ctx = createCtx({
        attackerAbilityName: 'いかく',
        defenderAbilityName: 'フェアリーオーラ',
      });

      // Act
      const result = effect.modifyAnyBasePower(holder, 90, ctx);

      // Assert
      // floor((90 × 5448 + 2047) / 4096) = 120
      expect(result).toBe(120);
    });

    it('相手がオーラブレイクのときは威力を 3072/4096 倍にする', () => {
      // Arrange
      const ctx = createCtx({ defenderAbilityName: 'オーラブレイク' });

      // Act
      const result = effect.modifyAnyBasePower(holder, 100, ctx);

      // Assert
      expect(result).toBe(75);
    });

    it('オーラブレイクのポケモンが使ったフェアリー技の威力も 3072/4096 倍にする', () => {
      // Arrange
      const ctx = createCtx({
        attackerAbilityName: 'オーラブレイク',
        defenderAbilityName: 'フェアリーオーラ',
      });

      // Act
      const result = effect.modifyAnyBasePower(holder, 90, ctx);

      // Assert
      // floor((90 × 3072 + 2047) / 4096) = 67（67.5 のちょうど半分は切り捨て）
      expect(result).toBe(67);
    });

    it('フェアリー以外の技の威力は変えない', () => {
      // Arrange
      const ctx = createCtx({ moveTypeName: 'あく' });

      // Act
      const result = effect.modifyAnyBasePower(holder, 100, ctx);

      // Assert
      expect(result).toBeUndefined();
    });

    it('battleContext が無い場合は威力を変えない', () => {
      // Act
      const result = effect.modifyAnyBasePower(holder, 100, undefined);

      // Assert
      expect(result).toBeUndefined();
    });
  });
});
