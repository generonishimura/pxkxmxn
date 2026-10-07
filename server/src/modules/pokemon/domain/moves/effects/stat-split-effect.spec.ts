import { GuardSplitEffect } from './guard-split-effect';
import { PowerSplitEffect } from './power-split-effect';
import { MoveRegistry } from '../move-registry';
import { BattleStatValues } from '../../abilities/battle-context.interface';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('実数値を分け合う技（ガードシェア・パワーシェア）', () => {
  const stats = (overrides: Partial<BattleStatValues> = {}): BattleStatValues => ({
    attack: 100,
    defense: 100,
    specialAttack: 100,
    specialDefense: 100,
    speed: 100,
    ...overrides,
  });

  describe('GuardSplitEffect（ガードシェア）', () => {
    it('防御・特防の実数値を、両者の平均（切り捨て）にする', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();
      const ctx = context({
        attackerStats: stats({ defense: 101, specialDefense: 80 }),
        defenderStats: stats({ defense: 200, specialDefense: 151 }),
      });

      // Act
      const message = await new GuardSplitEffect().onUse(get(1), get(2), ctx);

      // Assert
      expect(get(1).volatileState.statOverrides).toEqual({ defense: 150, specialDefense: 115 });
      expect(get(2).volatileState.statOverrides).toEqual({ defense: 150, specialDefense: 115 });
      expect(message).toBe('shared its guard with the target!');
    });

    it('ほかの実数値の上書き（パワートリックなど）は残す', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { status: { volatileState: { statOverrides: { attack: 90, defense: 120 } } } },
        { status: { volatileState: { statOverrides: { speed: 70 } } } },
      );
      const ctx = context({
        attackerStats: stats({ attack: 90, defense: 120, specialDefense: 100 }),
        defenderStats: stats({ defense: 80, specialDefense: 60, speed: 70 }),
      });

      // Act
      await new GuardSplitEffect().onUse(get(1), get(2), ctx);

      // Assert
      expect(get(1).volatileState.statOverrides).toEqual({
        attack: 90,
        defense: 100,
        specialDefense: 80,
      });
      expect(get(2).volatileState.statOverrides).toEqual({
        defense: 100,
        specialDefense: 80,
        speed: 70,
      });
    });

    it('攻撃・特攻・素早さは変えない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();
      const ctx = context({
        attackerStats: stats({ attack: 50, specialAttack: 60, speed: 70 }),
        defenderStats: stats({ attack: 150, specialAttack: 160, speed: 170 }),
      });

      // Act
      await new GuardSplitEffect().onUse(get(1), get(2), ctx);

      // Assert
      expect(get(1).volatileState.statOverrides).not.toHaveProperty('attack');
      expect(get(1).volatileState.statOverrides).not.toHaveProperty('specialAttack');
      expect(get(1).volatileState.statOverrides).not.toHaveProperty('speed');
    });

    it('実数値がコンテキストになければ、失敗する', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const message = await new GuardSplitEffect().onUse(get(1), get(2), context());

      // Assert
      expect(get(1).volatileState.statOverrides).toBeUndefined();
      expect(message).toBe('But it failed');
    });
  });

  describe('PowerSplitEffect（パワーシェア）', () => {
    it('攻撃・特攻の実数値を、両者の平均（切り捨て）にする', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();
      const ctx = context({
        attackerStats: stats({ attack: 51, specialAttack: 200 }),
        defenderStats: stats({ attack: 150, specialAttack: 99 }),
      });

      // Act
      const message = await new PowerSplitEffect().onUse(get(1), get(2), ctx);

      // Assert
      expect(get(1).volatileState.statOverrides).toEqual({ attack: 100, specialAttack: 149 });
      expect(get(2).volatileState.statOverrides).toEqual({ attack: 100, specialAttack: 149 });
      expect(message).toBe('shared its power with the target!');
    });

    it('防御・特防・素早さは変えない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();
      const ctx = context({
        attackerStats: stats({ defense: 50, specialDefense: 60, speed: 70 }),
        defenderStats: stats({ defense: 150, specialDefense: 160, speed: 170 }),
      });

      // Act
      await new PowerSplitEffect().onUse(get(1), get(2), ctx);

      // Assert
      expect(get(2).volatileState.statOverrides).toEqual({ attack: 100, specialAttack: 100 });
    });
  });

  describe('MoveRegistry への登録', () => {
    beforeEach(() => {
      MoveRegistry.initialize();
    });

    it.each([
      ['ガードシェア', GuardSplitEffect],
      ['パワーシェア', PowerSplitEffect],
    ])('%s が登録されている', (moveName, effectClass) => {
      // Act
      const effect = MoveRegistry.get(moveName);

      // Assert
      expect(effect).toBeInstanceOf(effectClass);
    });
  });
});
