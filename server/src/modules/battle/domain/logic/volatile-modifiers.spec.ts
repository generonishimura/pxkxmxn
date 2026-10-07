import {
  alwaysHitsByVolatile,
  applyStatOverrides,
  basePowerModifierByVolatile,
  ignoresPositiveEvasionByVolatile,
  ignoresTypeImmunityByVolatile,
  isGroundedByVolatile,
  isLevitatingByVolatile,
  semiInvulnerableDamageMultiplier,
  typeEffectivenessMultiplierByVolatile,
} from './volatile-modifiers';

describe('volatile-modifiers（一時的な状態の補正）', () => {
  const stats = { attack: 100, defense: 80, specialAttack: 60, specialDefense: 40, speed: 20 };

  describe('applyStatOverrides', () => {
    it('上書きのある実数値だけを置き換える', () => {
      // Arrange
      const state = { statOverrides: { attack: 80, defense: 100 } };

      // Act
      const result = applyStatOverrides(stats, state);

      // Assert
      expect(result).toEqual({ ...stats, attack: 80, defense: 100 });
    });

    it('上書きがなければ、同じオブジェクトを返す', () => {
      // Act
      const result = applyStatOverrides(stats, {});

      // Assert
      expect(result).toBe(stats);
    });
  });

  describe('地面にいるか', () => {
    it('でんじふゆう・テレキネシス中は地面にいない', () => {
      // Act & Assert
      expect(isLevitatingByVolatile({ magnetRiseTurns: 5 })).toBe(true);
      expect(isLevitatingByVolatile({ telekinesisTurns: 3 })).toBe(true);
    });

    it('ねをはっていれば、でんじふゆう中でも地面にいる', () => {
      // Act & Assert
      expect(isLevitatingByVolatile({ magnetRiseTurns: 5, ingrain: true })).toBe(false);
      expect(isGroundedByVolatile({ ingrain: true })).toBe(true);
    });
  });

  describe('タイプ相性', () => {
    it.each([
      [{ foresight: true }, 'ノーマル', 'ゴースト', true],
      [{ foresight: true }, 'かくとう', 'ゴースト', true],
      [{ foresight: true }, 'エスパー', 'あく', false],
      [{ miracleEye: true }, 'エスパー', 'あく', true],
      [{ ingrain: true }, 'じめん', 'ひこう', true],
      [{}, 'ノーマル', 'ゴースト', false],
    ])(
      '%j の相手に %s 技を %s タイプへ当てると、相性 0 を無視するか: %s',
      (state, moveType, defenderType, expected) => {
        // Act
        const result = ignoresTypeImmunityByVolatile(state, moveType, defenderType);

        // Assert
        expect(result).toBe(expected);
      },
    );

    it('タールショットはほのお技の相性を 2 倍、でんじふゆうはじめん技を 0 倍にする', () => {
      // Act & Assert
      expect(typeEffectivenessMultiplierByVolatile({ tarShot: true }, 'ほのお')).toBe(2);
      expect(typeEffectivenessMultiplierByVolatile({ tarShot: true }, 'みず')).toBe(1);
      expect(typeEffectivenessMultiplierByVolatile({ magnetRiseTurns: 2 }, 'じめん')).toBe(0);
    });
  });

  it('じゅうでん中のでんき技は、威力を 2 倍（8192/4096）にする', () => {
    // Act & Assert
    expect(basePowerModifierByVolatile({ charged: true }, 'でんき')).toBe(8192);
    expect(basePowerModifierByVolatile({ charged: true }, 'ほのお')).toBeUndefined();
    expect(basePowerModifierByVolatile({}, 'でんき')).toBeUndefined();
  });

  it('そらをとぶ中の相手へのかぜおこしは 2 倍、ほかの技は 1 倍', () => {
    // Act & Assert
    expect(semiInvulnerableDamageMultiplier({ semiInvulnerable: 'air' }, 'かぜおこし')).toBe(2);
    expect(semiInvulnerableDamageMultiplier({ semiInvulnerable: 'air' }, 'かみなり')).toBe(1);
    expect(semiInvulnerableDamageMultiplier({}, 'かぜおこし')).toBe(1);
  });

  it('みやぶる・ミラクルアイで、上がった回避ランクを無視する', () => {
    // Act & Assert
    expect(ignoresPositiveEvasionByVolatile({ foresight: true })).toBe(true);
    expect(ignoresPositiveEvasionByVolatile({ miracleEye: true })).toBe(true);
    expect(ignoresPositiveEvasionByVolatile({})).toBe(false);
  });

  it('使用者のロックオン、相手のテレキネシスで必ず当たる', () => {
    // Act & Assert
    expect(alwaysHitsByVolatile({ lockOnTurns: 1 }, {})).toBe(true);
    expect(alwaysHitsByVolatile({}, { telekinesisTurns: 1 })).toBe(true);
    expect(alwaysHitsByVolatile({}, {})).toBe(false);
  });
});
