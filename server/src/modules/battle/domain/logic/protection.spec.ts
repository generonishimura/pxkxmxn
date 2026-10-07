import {
  ProtectionIncomingMove,
  findBlockingGuard,
  keepsProtectCount,
  protectSuccessChance,
} from './protection';

describe('protection', () => {
  describe('protectSuccessChance', () => {
    it.each([
      [0, 1],
      [1, 1 / 3],
      [2, 1 / 9],
      [6, 1 / 729],
    ])('まもる系を続けて %i 回成功させたあとの成功率は %d', (count, expected) => {
      // Act
      const chance = protectSuccessChance(count);

      // Assert
      expect(chance).toBe(expected);
    });

    it('成功率は 1/729 より下がらない（本家の counterMax）', () => {
      // Act
      const chance = protectSuccessChance(10);

      // Assert
      expect(chance).toBe(1 / 729);
    });
  });

  describe('findBlockingGuard', () => {
    const tackle: ProtectionIncomingMove = {
      moveName: 'たいあたり',
      category: 'Physical',
      effectivePriority: 0,
    };
    const thunderWave: ProtectionIncomingMove = {
      moveName: 'でんじは',
      category: 'Status',
      effectivePriority: 0,
    };

    it('まもるは攻撃技も変化技も防ぐ', () => {
      // Act
      const attack = findBlockingGuard({ protection: 'protect', side: {}, move: tackle });
      const status = findBlockingGuard({ protection: 'protect', side: {}, move: thunderWave });

      // Assert
      expect(attack).toBe('protect');
      expect(status).toBe('protect');
    });

    it.each(['spikyShield', 'banefulBunker'] as const)('%s は変化技も防ぐ', kind => {
      // Act
      const guard = findBlockingGuard({ protection: kind, side: {}, move: thunderWave });

      // Assert
      expect(guard).toBe(kind);
    });

    it.each(['kingsShield', 'obstruct', 'silkTrap', 'burningBulwark'] as const)(
      '%s は攻撃技だけを防ぎ、変化技は通す',
      kind => {
        // Act
        const attack = findBlockingGuard({ protection: kind, side: {}, move: tackle });
        const status = findBlockingGuard({ protection: kind, side: {}, move: thunderWave });

        // Assert
        expect(attack).toBe(kind);
        expect(status).toBeUndefined();
      },
    );

    it('こらえるは技を防がない', () => {
      // Act
      const guard = findBlockingGuard({ protection: 'endure', side: {}, move: tackle });

      // Assert
      expect(guard).toBeUndefined();
    });

    it('まもるで防げない技（noProtect）は通す', () => {
      // Act
      const guard = findBlockingGuard({
        protection: 'protect',
        side: {},
        move: { moveName: 'ハイパードリル', category: 'Physical', effectivePriority: 0 },
      });

      // Assert
      expect(guard).toBeUndefined();
    });

    it('bypassesProtect（ふかしのこぶしなど）なら通す', () => {
      // Act
      const guard = findBlockingGuard({
        protection: 'protect',
        side: {},
        move: { ...tackle, bypassesProtect: true },
      });

      // Assert
      expect(guard).toBeUndefined();
    });

    it('ファストガードは優先度が 1 以上の技だけを防ぐ（変化技も防ぐ）', () => {
      // Act
      const priority = findBlockingGuard({
        side: { quickGuard: true },
        move: { ...thunderWave, effectivePriority: 1 },
      });
      const normal = findBlockingGuard({ side: { quickGuard: true }, move: tackle });

      // Assert
      expect(priority).toBe('quickGuard');
      expect(normal).toBeUndefined();
    });

    it('ワイドガードは相手全体・自分以外全体の技（spread）だけを防ぐ', () => {
      // Act
      const spread = findBlockingGuard({
        side: { wideGuard: true },
        move: { moveName: 'じしん', category: 'Physical', effectivePriority: 0 },
      });
      const single = findBlockingGuard({ side: { wideGuard: true }, move: tackle });

      // Assert
      expect(spread).toBe('wideGuard');
      expect(single).toBeUndefined();
    });

    it('トリックガードは変化技だけを防ぎ、まもるで防げない変化技も防ぐ', () => {
      // Act
      const status = findBlockingGuard({ side: { craftyShield: true }, move: thunderWave });
      const roar = findBlockingGuard({
        side: { craftyShield: true },
        move: { moveName: 'ほえる', category: 'Status', effectivePriority: -6 },
      });
      const attack = findBlockingGuard({ side: { craftyShield: true }, move: tackle });

      // Assert
      expect(status).toBe('craftyShield');
      expect(roar).toBe('craftyShield');
      expect(attack).toBeUndefined();
    });

    it('たたみがえしは攻撃技だけを防ぐ', () => {
      // Act
      const attack = findBlockingGuard({ side: { matBlock: true }, move: tackle });
      const status = findBlockingGuard({ side: { matBlock: true }, move: thunderWave });

      // Assert
      expect(attack).toBe('matBlock');
      expect(status).toBeUndefined();
    });
  });

  describe('keepsProtectCount', () => {
    it.each([
      [{ protection: { kind: 'protect' as const } }, true],
      [{ protection: { kind: 'endure' as const } }, true],
      [{ protection: { side: 'wideGuard' as const } }, true],
      [{ protection: { side: 'quickGuard' as const } }, true],
      [{ protection: { side: 'craftyShield' as const } }, false],
      [{ protection: { side: 'matBlock' as const } }, false],
      [{ isProtectionMove: true }, true],
      [{}, false],
    ])('%o を出したあと、まもる系を続けた回数を残すかは %s', (moveEffect, expected) => {
      // Act
      const keeps = keepsProtectCount(moveEffect);

      // Assert
      expect(keeps).toBe(expected);
    });
  });
});
