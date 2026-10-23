import { NoRetreatEffect } from './no-retreat-effect';
import { BaseMultiHitEffect } from './base-multi-hit-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('NoRetreatEffect', () => {
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
      patchVolatileState: jest.fn().mockResolvedValue(undefined),
    };
    return {
      battle,
      battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
    };
  };

  it('連続技ではない（攻撃技ではなく変化技）', () => {
    // Act
    const effect = new NoRetreatEffect();

    // Assert
    expect(effect).not.toBeInstanceOf(BaseMultiHitEffect);
  });

  it('onUse で自分の攻撃・防御・特攻・特防・素早さを1段階ずつ上げる', async () => {
    // Arrange
    const effect = new NoRetreatEffect();
    const attacker = createBattlePokemonStatus({ attackRank: 1, speedRank: -1 });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBe(
      'Attack rose! Defense rose! Special Attack rose! Special Defense rose! Speed rose!',
    );
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      attackRank: 2,
      defenseRank: 1,
      specialAttackRank: 1,
      specialDefenseRank: 1,
      speedRank: 0,
    });
  });

  it('5つの能力がすべて+6のときは何も起こらない', async () => {
    // Arrange
    const effect = new NoRetreatEffect();
    const attacker = createBattlePokemonStatus({
      attackRank: 6,
      defenseRank: 6,
      specialAttackRank: 6,
      specialDefenseRank: 6,
      speedRank: 6,
    });
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('battleRepository が無い場合は null', async () => {
    // Arrange
    const effect = new NoRetreatEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx: BattleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    };

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBeNull();
  });

  describe('共通の能力ランク変化の経路', () => {
    beforeEach(() => {
      AbilityRegistry.clear();
      AbilityRegistry.initialize();
    });

    it('あまのじゃくの使用者は、5つの能力がそれぞれ1段階下がる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'あまのじゃく' });

      // Act
      await new NoRetreatEffect().onUse(get(1), get(2), context({ attacker: get(1) }));

      // Assert
      expect(get(1).attackRank).toBe(-1);
      expect(get(1).defenseRank).toBe(-1);
      expect(get(1).specialAttackRank).toBe(-1);
      expect(get(1).specialDefenseRank).toBe(-1);
      expect(get(1).speedRank).toBe(-1);
    });

    it('たんじゅんの使用者は、5つの能力がそれぞれ2段階上がる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'たんじゅん' });

      // Act
      await new NoRetreatEffect().onUse(get(1), get(2), context({ attacker: get(1) }));

      // Assert
      expect(get(1).attackRank).toBe(2);
      expect(get(1).speedRank).toBe(2);
    });

    it('相手の特性に関係なく、自分のランクが上がる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { ability: 'ミラーアーマー' });

      // Act
      await new NoRetreatEffect().onUse(get(1), get(2), context({ attacker: get(1) }));

      // Assert
      expect(get(1).attackRank).toBe(1);
      expect(get(2).attackRank).toBe(0);
    });
  });
});
