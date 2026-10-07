import {
  shouldHealOnEntry,
  spikesDamage,
  stealthRockDamage,
  toxicSpikesOutcome,
} from './entry-hazards';

describe('entry-hazards', () => {
  describe('stealthRockDamage', () => {
    it.each([
      [1, 20],
      [2, 40],
      [4, 80],
      [0.5, 10],
      [0.25, 5],
    ])('いわの相性 %p 倍なら、最大 HP 160 のポケモンに %p のダメージ', (effectiveness, damage) => {
      // Act
      const result = stealthRockDamage(160, effectiveness);

      // Assert
      expect(result).toBe(damage);
    });

    it('ダメージは切り捨てで、最低 1', () => {
      // Act
      const result = stealthRockDamage(3, 0.25);

      // Assert
      expect(result).toBe(1);
    });
  });

  describe('spikesDamage', () => {
    it.each([
      [1, 20],
      [2, 26],
      [3, 40],
    ])('まきびし %p 層なら、最大 HP 160 のポケモンに %p のダメージ', (layers, damage) => {
      // Act
      const result = spikesDamage(160, layers);

      // Assert
      expect(result).toBe(damage);
    });
  });

  describe('toxicSpikesOutcome', () => {
    it('1 層ならどく、2 層ならもうどく', () => {
      // Act
      const one = toxicSpikesOutcome(1, { grounded: true, typeNames: ['ノーマル'] });
      const two = toxicSpikesOutcome(2, { grounded: true, typeNames: ['ノーマル'] });

      // Assert
      expect(one).toBe('poison');
      expect(two).toBe('badPoison');
    });

    it('地面にいるどくタイプは、どくびしを消す', () => {
      // Act
      const outcome = toxicSpikesOutcome(2, { grounded: true, typeNames: ['くさ', 'どく'] });

      // Assert
      expect(outcome).toBe('absorb');
    });

    it('地面にいないポケモンには効かない（どくタイプでも消さない）', () => {
      // Act
      const outcome = toxicSpikesOutcome(1, { grounded: false, typeNames: ['どく', 'ひこう'] });

      // Assert
      expect(outcome).toBe('none');
    });
  });

  describe('shouldHealOnEntry', () => {
    it('いやしのねがいは、HP が減っているか状態異常のポケモンを回復する', () => {
      // Act
      const hurt = shouldHealOnEntry('healingWish', { hpFull: false, hasStatus: false });
      const statused = shouldHealOnEntry('healingWish', { hpFull: true, hasStatus: true });

      // Assert
      expect(hurt).toBe(true);
      expect(statused).toBe(true);
    });

    it('いやしのねがいは、元気なポケモンが出てきたときは残す', () => {
      // Act
      const result = shouldHealOnEntry('healingWish', {
        hpFull: true,
        hasStatus: false,
        ppFull: false,
      });

      // Assert
      expect(result).toBe(false);
    });

    it('みかづきのまいは、PP が減っているだけのポケモンも回復する', () => {
      // Act
      const result = shouldHealOnEntry('lunarDance', {
        hpFull: true,
        hasStatus: false,
        ppFull: false,
      });

      // Assert
      expect(result).toBe(true);
    });
  });
});
