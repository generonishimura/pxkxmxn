import { PsychicEffect } from './psychic-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('PsychicEffect', () => {
  const createBattlePokemonStatus = (
    overrides?: Partial<BattlePokemonStatus>,
  ): BattlePokemonStatus => {
    return new BattlePokemonStatus(
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
  };

  const createBattleContext = (): BattleContext => {
    const battle = new Battle(
      1, // id
      1, // trainer1Id
      2, // trainer2Id
      1, // team1Id
      2, // team2Id
      1, // turn
      null, // weather
      null, // field
      BattleStatus.Active, // status
      null, // winnerTrainerId
    );

    const mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    };

    return {
      battle,
      battleRepository: mockBattleRepository as any,
      trainedPokemonRepository: undefined as any,
    };
  };

  describe('基本設定', () => {
    it('ステータスタイプが特防である', () => {
      const effect = new PsychicEffect();
      expect((effect as any).statType).toBe('specialDefense');
    });

    it('ランク変化が-1である', () => {
      const effect = new PsychicEffect();
      expect((effect as any).rankChange).toBe(-1);
    });

    it('確率が10%である', () => {
      const effect = new PsychicEffect();
      expect((effect as any).chance).toBe(0.1);
    });
  });

  describe('onHit', () => {
    it('10%の確率で特防ランクを1段階下げる', async () => {
      const effect = new PsychicEffect();
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus({ specialDefenseRank: 0 });
      const battleContext = createBattleContext();

      // 複数回実行して確率的な動作を確認
      const results: (string | null)[] = [];
      for (let i = 0; i < 1000; i++) {
        // モックをリセット
        (battleContext.battleRepository?.updateBattlePokemonStatus as jest.Mock).mockClear();
        const result = await effect.onHit(attacker, defender, battleContext);
        results.push(result);
      }

      const successCount = results.filter(r => r !== null).length;
      // 10%の確率なので、7%以上13%以下になることが期待される（70-130回）
      expect(successCount).toBeGreaterThan(70);
      expect(successCount).toBeLessThan(130);
    });
  });
});
