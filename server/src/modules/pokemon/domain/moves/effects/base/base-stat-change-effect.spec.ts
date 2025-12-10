import { BaseStatChangeEffect } from './base-stat-change-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

/**
 * テスト用の具象クラス（特防ランクを下げる）
 */
class TestSpecialDefenseDownEffect extends BaseStatChangeEffect {
  protected readonly statType = 'specialDefense' as const;
  protected readonly rankChange = -1;
  protected readonly chance = 1.0; // 100%の確率でテストしやすくする
}

describe('BaseStatChangeEffect', () => {
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

  describe('onHit', () => {
    it('確率に基づいて相手のステータスランクを変更する', async () => {
      const effect = new TestSpecialDefenseDownEffect();
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus({ specialDefenseRank: 0 });
      const battleContext = createBattleContext();

      const result = await effect.onHit(attacker, defender, battleContext);

      expect(result).toBe('Special Defense fell!');
      expect(battleContext.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(
        defender.id,
        { specialDefenseRank: -1 },
      );
    });

    it('確率判定に失敗した場合は何もしない', async () => {
      // chanceを0.0に設定したテスト用クラス
      class TestEffectWithZeroChance extends BaseStatChangeEffect {
        protected readonly statType = 'specialDefense' as const;
        protected readonly rankChange = -1;
        protected readonly chance = 0.0;
      }

      const effect = new TestEffectWithZeroChance();
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus({ specialDefenseRank: 0 });
      const battleContext = createBattleContext();

      const result = await effect.onHit(attacker, defender, battleContext);

      expect(result).toBeNull();
      expect(battleContext.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('ランクが-6の場合はそれ以上下がらない', async () => {
      const effect = new TestSpecialDefenseDownEffect();
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus({ specialDefenseRank: -6 });
      const battleContext = createBattleContext();

      const result = await effect.onHit(attacker, defender, battleContext);

      expect(result).toBeNull();
      expect(battleContext.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('ランクが+6の場合はそれ以上上がらない', async () => {
      class TestSpecialDefenseUpEffect extends BaseStatChangeEffect {
        protected readonly statType = 'specialDefense' as const;
        protected readonly rankChange = 1;
        protected readonly chance = 1.0;
      }

      const effect = new TestSpecialDefenseUpEffect();
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus({ specialDefenseRank: 6 });
      const battleContext = createBattleContext();

      const result = await effect.onHit(attacker, defender, battleContext);

      expect(result).toBeNull();
      expect(battleContext.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('battleRepositoryがない場合は何もしない', async () => {
      const effect = new TestSpecialDefenseDownEffect();
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus({ specialDefenseRank: 0 });
      const battleContext = createBattleContext();
      battleContext.battleRepository = undefined as any;

      const result = await effect.onHit(attacker, defender, battleContext);

      expect(result).toBeNull();
    });
  });
});

