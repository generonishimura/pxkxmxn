import { TechnicianEffect } from './technician-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';

describe('TechnicianEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  describe('modifyBasePower', () => {
    it('威力60の技は威力を1.5倍（6144/4096）にする', () => {
      // Act
      const result = new TechnicianEffect().modifyBasePower(pokemon, 60);

      // Assert
      expect(result).toBe(90);
    });

    it('威力60未満の技も4096分率で補正する（25 → 37.5 は五捨五超入で37）', () => {
      // Act
      const result = new TechnicianEffect().modifyBasePower(pokemon, 25);

      // Assert
      expect(result).toBe(37);
    });

    it('威力61以上の技は補正しない', () => {
      // Act
      const result = new TechnicianEffect().modifyBasePower(pokemon, 61);

      // Assert
      expect(result).toBeUndefined();
    });

    it('ヒットごとの威力（おやこあいの追加ヒットなど）で判定する', () => {
      // Act
      const result = new TechnicianEffect().modifyBasePower(pokemon, 20);

      // Assert
      expect(result).toBe(30);
    });
  });

  it('ダメージ段階の補正（modifyDamageDealt）は持たない', () => {
    // Act
    const effect = new TechnicianEffect();

    // Assert
    expect('modifyDamageDealt' in effect).toBe(false);
  });
});
