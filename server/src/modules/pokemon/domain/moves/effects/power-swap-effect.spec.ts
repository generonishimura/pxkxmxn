import { PowerSwapEffect } from './power-swap-effect';
import { GuardSwapEffect } from './guard-swap-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('Power/Guard Swap', () => {
  const createBattlePokemonStatus = (
    overrides?: Partial<BattlePokemonStatus>,
  ): BattlePokemonStatus =>
    new BattlePokemonStatus(
      overrides?.id ?? 1,
      overrides?.battleId ?? 1,
      overrides?.trainedPokemonId ?? 1,
      overrides?.trainerId ?? 1,
      overrides?.isActive ?? true,
      overrides?.currentHp ?? 100,
      overrides?.maxHp ?? 100,
      overrides?.attackRank ?? 0,
      overrides?.defenseRank ?? 0,
      overrides?.specialAttackRank ?? 0,
      overrides?.specialDefenseRank ?? 0,
      overrides?.speedRank ?? 0,
      overrides?.accuracyRank ?? 0,
      overrides?.evasionRank ?? 0,
      overrides?.statusCondition ?? null,
    );

  const createBattleContext = (): BattleContext => {
    const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
    const mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    };
    return {
      battle,
      battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
    };
  };

  describe('PowerSwapEffect', () => {
    it('攻撃・特攻のランクを相手と交換する', async () => {
      const effect = new PowerSwapEffect();
      const attacker = createBattlePokemonStatus({ attackRank: 2, specialAttackRank: 3 });
      const defender = createBattlePokemonStatus({
        id: 2,
        attackRank: -1,
        specialAttackRank: -2,
      });
      const ctx = createBattleContext();

      await effect.onUse(attacker, defender, ctx);

      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
        attackRank: 2,
        specialAttackRank: 3,
      });
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
        attackRank: -1,
        specialAttackRank: -2,
      });
    });

    it('他の能力ランクは変更しない', async () => {
      const effect = new PowerSwapEffect();
      const attacker = createBattlePokemonStatus({
        attackRank: 1,
        specialAttackRank: 1,
        defenseRank: 5,
        speedRank: 5,
      });
      const defender = createBattlePokemonStatus({ id: 2 });
      const ctx = createBattleContext();

      await effect.onUse(attacker, defender, ctx);

      const calls = (ctx.battleRepository?.updateBattlePokemonStatus as jest.Mock).mock.calls;
      for (const [, update] of calls) {
        expect(update).not.toHaveProperty('defenseRank');
        expect(update).not.toHaveProperty('speedRank');
      }
    });
  });

  describe('GuardSwapEffect', () => {
    it('防御・特防のランクを相手と交換する', async () => {
      const effect = new GuardSwapEffect();
      const attacker = createBattlePokemonStatus({ defenseRank: 3, specialDefenseRank: 2 });
      const defender = createBattlePokemonStatus({
        id: 2,
        defenseRank: -1,
        specialDefenseRank: 0,
      });
      const ctx = createBattleContext();

      await effect.onUse(attacker, defender, ctx);

      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
        defenseRank: 3,
        specialDefenseRank: 2,
      });
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
        defenseRank: -1,
        specialDefenseRank: 0,
      });
    });
  });
});
