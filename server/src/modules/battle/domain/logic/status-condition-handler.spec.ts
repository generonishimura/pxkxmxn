import { StatusConditionHandler } from './status-condition-handler';
import { StatusCondition } from '../entities/status-condition.enum';
import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';

describe('StatusConditionHandler', () => {
  const createBattlePokemonStatus = (
    statusCondition: StatusCondition | null,
    maxHp: number = 100,
  ): BattlePokemonStatus => {
    return new BattlePokemonStatus(
      1, // id
      1, // battleId
      1, // trainedPokemonId
      1, // trainerId
      true, // isActive
      maxHp, // currentHp
      maxHp, // maxHp
      0, // attackRank
      0, // defenseRank
      0, // specialAttackRank
      0, // specialDefenseRank
      0, // speedRank
      0, // accuracyRank
      0, // evasionRank
      statusCondition,
    );
  };

  describe('canAct', () => {
    it('状態異常がない場合は行動可能', () => {
      const status = createBattlePokemonStatus(StatusCondition.None);
      expect(StatusConditionHandler.canAct(status)).toBe(true);
    });

    it('状態異常がnullの場合は行動可能', () => {
      const status = createBattlePokemonStatus(null);
      expect(StatusConditionHandler.canAct(status)).toBe(true);
    });

    it('ねむりの場合は行動不能', () => {
      const status = createBattlePokemonStatus(StatusCondition.Sleep);
      expect(StatusConditionHandler.canAct(status)).toBe(false);
    });

    it('やけど・どく・もうどくの場合は行動可能（ひるみ・こんらんは volatileState で判定する）', () => {
      expect(StatusConditionHandler.canAct(createBattlePokemonStatus(StatusCondition.Burn))).toBe(
        true,
      );
      expect(StatusConditionHandler.canAct(createBattlePokemonStatus(StatusCondition.Poison))).toBe(
        true,
      );
      expect(
        StatusConditionHandler.canAct(createBattlePokemonStatus(StatusCondition.BadPoison)),
      ).toBe(true);
    });

    it('こおりは乱数が 0.25 未満なら行動可能（チャンピオンズは 25%）', () => {
      const random = jest.spyOn(Math, 'random').mockReturnValueOnce(0.24).mockReturnValueOnce(0.25);
      const status = createBattlePokemonStatus(StatusCondition.Freeze);

      expect(StatusConditionHandler.canAct(status)).toBe(true);
      expect(StatusConditionHandler.canAct(status)).toBe(false);

      random.mockRestore();
    });

    it('まひは乱数が 0.125 未満なら行動不能（チャンピオンズは 12.5%）', () => {
      const random = jest
        .spyOn(Math, 'random')
        .mockReturnValueOnce(0.124)
        .mockReturnValueOnce(0.125);
      const status = createBattlePokemonStatus(StatusCondition.Paralysis);

      expect(StatusConditionHandler.canAct(status)).toBe(false);
      expect(StatusConditionHandler.canAct(status)).toBe(true);

      random.mockRestore();
    });
  });

  describe('calculateTurnEndDamage', () => {
    it('状態異常がない場合はダメージ0', () => {
      const status = createBattlePokemonStatus(StatusCondition.None, 100);
      expect(StatusConditionHandler.calculateTurnEndDamage(status)).toBe(0);
    });

    it('やけどの場合は最大HPの1/16のダメージ', () => {
      const status = createBattlePokemonStatus(StatusCondition.Burn, 160);
      expect(StatusConditionHandler.calculateTurnEndDamage(status)).toBe(10); // 160 / 16 = 10
    });

    it('どくの場合は最大HPの1/8のダメージ', () => {
      const status = createBattlePokemonStatus(StatusCondition.Poison, 160);
      expect(StatusConditionHandler.calculateTurnEndDamage(status)).toBe(20); // 160 / 8 = 20
    });

    it('もうどくの場合はターン数に応じてダメージが増加', () => {
      const status = createBattlePokemonStatus(StatusCondition.BadPoison, 160);

      // 1ターン目: 1/16 = 10
      expect(StatusConditionHandler.calculateTurnEndDamage(status, 0)).toBe(10);

      // 2ターン目: 2/16 = 20
      expect(StatusConditionHandler.calculateTurnEndDamage(status, 1)).toBe(20);

      // 3ターン目: 3/16 = 30
      expect(StatusConditionHandler.calculateTurnEndDamage(status, 2)).toBe(30);

      // 8ターン目: 8/16 = 80（最大）
      expect(StatusConditionHandler.calculateTurnEndDamage(status, 7)).toBe(80);

      // 9ターン目以降も最大値（1/2）を維持
      expect(StatusConditionHandler.calculateTurnEndDamage(status, 8)).toBe(80);
      expect(StatusConditionHandler.calculateTurnEndDamage(status, 100)).toBe(80);
    });

    it('こおり・ねむり・まひ・ひるみ・こんらんの場合はダメージ0', () => {
      expect(
        StatusConditionHandler.calculateTurnEndDamage(
          createBattlePokemonStatus(StatusCondition.Freeze, 100),
        ),
      ).toBe(0);
      expect(
        StatusConditionHandler.calculateTurnEndDamage(
          createBattlePokemonStatus(StatusCondition.Sleep, 100),
        ),
      ).toBe(0);
      expect(
        StatusConditionHandler.calculateTurnEndDamage(
          createBattlePokemonStatus(StatusCondition.Paralysis, 100),
        ),
      ).toBe(0);
      expect(
        StatusConditionHandler.calculateTurnEndDamage(
          createBattlePokemonStatus(StatusCondition.Flinch, 100),
        ),
      ).toBe(0);
      expect(
        StatusConditionHandler.calculateTurnEndDamage(
          createBattlePokemonStatus(StatusCondition.Confusion, 100),
        ),
      ).toBe(0);
    });
  });

  describe('getPhysicalAttackMultiplier', () => {
    it('やけどの場合は0.5倍', () => {
      const status = createBattlePokemonStatus(StatusCondition.Burn);
      expect(StatusConditionHandler.getPhysicalAttackMultiplier(status)).toBe(0.5);
    });

    it('やけど以外の場合は1.0倍', () => {
      expect(
        StatusConditionHandler.getPhysicalAttackMultiplier(
          createBattlePokemonStatus(StatusCondition.None),
        ),
      ).toBe(1.0);
      expect(
        StatusConditionHandler.getPhysicalAttackMultiplier(
          createBattlePokemonStatus(StatusCondition.Poison),
        ),
      ).toBe(1.0);
      expect(
        StatusConditionHandler.getPhysicalAttackMultiplier(
          createBattlePokemonStatus(StatusCondition.Freeze),
        ),
      ).toBe(1.0);
      expect(
        StatusConditionHandler.getPhysicalAttackMultiplier(
          createBattlePokemonStatus(StatusCondition.Sleep),
        ),
      ).toBe(1.0);
      expect(
        StatusConditionHandler.getPhysicalAttackMultiplier(
          createBattlePokemonStatus(StatusCondition.Paralysis),
        ),
      ).toBe(1.0);
      expect(
        StatusConditionHandler.getPhysicalAttackMultiplier(
          createBattlePokemonStatus(StatusCondition.BadPoison),
        ),
      ).toBe(1.0);
      expect(
        StatusConditionHandler.getPhysicalAttackMultiplier(
          createBattlePokemonStatus(StatusCondition.Flinch),
        ),
      ).toBe(1.0);
      expect(
        StatusConditionHandler.getPhysicalAttackMultiplier(
          createBattlePokemonStatus(StatusCondition.Confusion),
        ),
      ).toBe(1.0);
    });
  });

  describe('isClearedOnSwitch', () => {
    it('状態異常がない場合はfalse', () => {
      expect(StatusConditionHandler.isClearedOnSwitch(StatusCondition.None)).toBe(false);
      expect(StatusConditionHandler.isClearedOnSwitch(null)).toBe(false);
    });

    it('やけど・どく・もうどく・まひ・こおり・ねむりは交代時に解除される', () => {
      expect(StatusConditionHandler.isClearedOnSwitch(StatusCondition.Burn)).toBe(true);
      expect(StatusConditionHandler.isClearedOnSwitch(StatusCondition.Poison)).toBe(true);
      expect(StatusConditionHandler.isClearedOnSwitch(StatusCondition.BadPoison)).toBe(true);
      expect(StatusConditionHandler.isClearedOnSwitch(StatusCondition.Paralysis)).toBe(true);
      expect(StatusConditionHandler.isClearedOnSwitch(StatusCondition.Freeze)).toBe(true);
      expect(StatusConditionHandler.isClearedOnSwitch(StatusCondition.Sleep)).toBe(true);
    });
  });

  describe('shouldClearSleep', () => {
    it('1ターン目は33%の確率で解除', () => {
      const results: boolean[] = [];
      for (let i = 0; i < 100; i++) {
        results.push(StatusConditionHandler.shouldClearSleep(0));
      }
      const trueCount = results.filter(r => r).length;
      // 33%の確率なので、20%以上45%以下になることが期待される
      expect(trueCount).toBeGreaterThan(20);
      expect(trueCount).toBeLessThan(45);
    });

    it('2ターン目は50%の確率で解除', () => {
      const results: boolean[] = [];
      for (let i = 0; i < 100; i++) {
        results.push(StatusConditionHandler.shouldClearSleep(1));
      }
      const trueCount = results.filter(r => r).length;
      // 50%の確率なので、35%以上65%以下になることが期待される
      expect(trueCount).toBeGreaterThan(35);
      expect(trueCount).toBeLessThan(65);
    });

    it('3ターン目以降は必ず解除', () => {
      expect(StatusConditionHandler.shouldClearSleep(2)).toBe(true);
      expect(StatusConditionHandler.shouldClearSleep(3)).toBe(true);
      expect(StatusConditionHandler.shouldClearSleep(100)).toBe(true);
    });

    it('step が2なら、1ターンで2ターン分の解除判定をする（はやおき）', () => {
      // Arrange: 1ターン目の判定（33%）は外れ、2ターン目の判定（50%）は当たる乱数
      const random = jest.spyOn(Math, 'random').mockReturnValueOnce(0.6).mockReturnValueOnce(0.4);

      // Act
      const cleared = StatusConditionHandler.shouldClearSleep(0, 2);

      // Assert
      expect(cleared).toBe(true);
      expect(random).toHaveBeenCalledTimes(2);
      random.mockRestore();
    });

    it('step が2でも、どちらの判定も外れれば解除しない', () => {
      // Arrange
      const random = jest.spyOn(Math, 'random').mockReturnValue(0.6);

      // Act
      const cleared = StatusConditionHandler.shouldClearSleep(0, 2);

      // Assert
      expect(cleared).toBe(false);
      random.mockRestore();
    });
  });

  describe('shouldClearFreeze', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('乱数が 0.25 未満なら解除（チャンピオンズは 25%）', () => {
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.24).mockReturnValueOnce(0.25);

      expect(StatusConditionHandler.shouldClearFreeze(0)).toBe(true);
      expect(StatusConditionHandler.shouldClearFreeze(0)).toBe(false);
    });

    it('動けなかった回数が 1 でも、乱数が外れれば解除しない', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.99);

      expect(StatusConditionHandler.shouldClearFreeze(1)).toBe(false);
    });

    it('動けなかった回数が 2 に達したら、乱数が外れても必ず解除する（3回目の行動）', () => {
      const random = jest.spyOn(Math, 'random').mockReturnValue(0.99);

      expect(StatusConditionHandler.shouldClearFreeze(2)).toBe(true);
      expect(StatusConditionHandler.shouldClearFreeze(5)).toBe(true);
      expect(random).not.toHaveBeenCalled();
    });
  });

  describe('shouldSelfAttackFromConfusion', () => {
    it('33%の確率で自分を攻撃', () => {
      const random = jest.spyOn(Math, 'random').mockReturnValueOnce(0.32).mockReturnValueOnce(0.33);

      expect(StatusConditionHandler.shouldSelfAttackFromConfusion()).toBe(true);
      expect(StatusConditionHandler.shouldSelfAttackFromConfusion()).toBe(false);

      random.mockRestore();
    });
  });
});
