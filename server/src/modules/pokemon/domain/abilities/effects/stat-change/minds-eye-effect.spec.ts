import { MindsEyeEffect } from './minds-eye-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';

describe('MindsEyeEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  let effect: MindsEyeEffect;

  beforeEach(() => {
    effect = new MindsEyeEffect();
  });

  describe('canReceiveStatChange', () => {
    it('命中率の低下は受けない', () => {
      // Act
      const result = effect.canReceiveStatChange(pokemon, 'accuracy', -1);

      // Assert
      expect(result).toBe(false);
    });

    it('命中率の上昇は判定しない', () => {
      // Act
      const result = effect.canReceiveStatChange(pokemon, 'accuracy', 1);

      // Assert
      expect(result).toBeUndefined();
    });

    it('命中率以外の低下は判定しない', () => {
      // Act
      const result = effect.canReceiveStatChange(pokemon, 'evasion', -1);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('ignoreOpponentRanks', () => {
    it('攻撃側のとき、相手の回避ランクを無視する', () => {
      // Act
      const result = effect.ignoreOpponentRanks(pokemon, 'attacker');

      // Assert
      expect(result).toEqual(['evasion']);
    });

    it('防御側のときは、相手のランクを無視しない', () => {
      // Act
      const result = effect.ignoreOpponentRanks(pokemon, 'defender');

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('ignoresTypeImmunity', () => {
    it.each(['ノーマル', 'かくとう'])('%s 技はゴーストタイプに等倍で当たる', moveType => {
      // Act
      const result = effect.ignoresTypeImmunity(pokemon, moveType, 'ゴースト');

      // Assert
      expect(result).toBe(true);
    });

    it('ノーマル・かくとう以外の技の無効は変えない', () => {
      // Act
      const result = effect.ignoresTypeImmunity(pokemon, 'じめん', 'ひこう');

      // Assert
      expect(result).toBe(false);
    });

    it('ゴースト以外のタイプの無効は変えない', () => {
      // Act
      const result = effect.ignoresTypeImmunity(pokemon, 'ノーマル', 'はがね');

      // Assert
      expect(result).toBe(false);
    });
  });
});
