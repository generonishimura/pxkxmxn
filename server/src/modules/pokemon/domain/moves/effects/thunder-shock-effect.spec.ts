import { ThunderShockEffect } from './thunder-shock-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('ThunderShockEffect', () => {
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

    const mockTrainedPokemonRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 1,
        pokemon: {
          id: 1,
          primaryType: { name: 'ノーマル' },
          secondaryType: null,
        },
        ability: null,
      }),
    };

    return {
      battle,
      battleRepository: mockBattleRepository as any,
      trainedPokemonRepository: mockTrainedPokemonRepository as any,
    };
  };

  describe('基本設定', () => {
    it('状態異常がまひである', () => {
      const effect = new ThunderShockEffect();
      expect((effect as any).statusCondition).toBe(StatusCondition.Paralysis);
    });

    it('確率が10%である', () => {
      const effect = new ThunderShockEffect();
      expect((effect as any).chance).toBe(0.1);
    });

    it('免疫タイプがでんきである', () => {
      const effect = new ThunderShockEffect();
      expect((effect as any).immuneTypes).toEqual(['でんき']);
    });
  });

  describe('onHit', () => {
    describe('10%でまひを付与する確率分岐', () => {
      // 旧テストは 1000 回試行で 70-130 回を期待していた確率テスト。
      // 二項分布の揺らぎを避けるため Math.random を決定的にモックする形に置き換える
      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('Math.random < 0.1 ならまひを付与', async () => {
        const effect = new ThunderShockEffect();
        const attacker = createBattlePokemonStatus();
        const defender = createBattlePokemonStatus();
        const battleContext = createBattleContext();
        jest.spyOn(Math, 'random').mockReturnValue(0.05);

        const result = await effect.onHit(attacker, defender, battleContext);

        expect(result).toBe('was paralyzed!');
      });

      it('Math.random >= 0.1 ならまひを付与しない', async () => {
        const effect = new ThunderShockEffect();
        const attacker = createBattlePokemonStatus();
        const defender = createBattlePokemonStatus();
        const battleContext = createBattleContext();
        jest.spyOn(Math, 'random').mockReturnValue(0.5);

        const result = await effect.onHit(attacker, defender, battleContext);

        expect(result).toBeNull();
      });
    });
  });
});
