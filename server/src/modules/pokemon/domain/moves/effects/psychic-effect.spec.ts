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
    describe('10%で特防ランクを1段階下げる確率分岐', () => {
      // 旧テストは 1000 回試行で 70-130 回を期待していた確率テスト。
      // 二項分布の揺らぎを避けるため Math.random を決定的にモックする形に置き換える
      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('Math.random < 0.1 なら特防 -1', async () => {
        const effect = new PsychicEffect();
        const attacker = createBattlePokemonStatus();
        const defender = createBattlePokemonStatus({ specialDefenseRank: 0 });
        const battleContext = createBattleContext();
        jest.spyOn(Math, 'random').mockReturnValue(0.05);

        const result = await effect.onHit(attacker, defender, battleContext);

        expect(result).not.toBeNull();
      });

      it('Math.random >= 0.1 なら特防は下がらない', async () => {
        const effect = new PsychicEffect();
        const attacker = createBattlePokemonStatus();
        const defender = createBattlePokemonStatus({ specialDefenseRank: 0 });
        const battleContext = createBattleContext();
        jest.spyOn(Math, 'random').mockReturnValue(0.5);

        const result = await effect.onHit(attacker, defender, battleContext);

        expect(result).toBeNull();
      });
    });
  });
});
