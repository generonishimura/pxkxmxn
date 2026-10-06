import { ToxicThreadEffect } from './toxic-thread-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('ToxicThreadEffect', () => {
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

  const createBattleContext = (overrides?: {
    defenderPrimaryType?: string;
    defenderSecondaryType?: string | null;
  }): BattleContext => {
    const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
    const mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    };
    const mockTrainedPokemonRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 1,
        pokemon: {
          id: 1,
          primaryType: { name: overrides?.defenderPrimaryType ?? 'むし' },
          secondaryType:
            overrides?.defenderSecondaryType !== undefined
              ? overrides.defenderSecondaryType
                ? { name: overrides.defenderSecondaryType }
                : null
              : null,
        },
        ability: null,
      }),
    };
    return {
      battle,
      battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
      trainedPokemonRepository:
        mockTrainedPokemonRepository as unknown as BattleContext['trainedPokemonRepository'],
    };
  };

  it('どくを付与しすばやさを1段階下げる', async () => {
    const effect = new ToxicThreadEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toBe('was poisoned! Speed fell!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      statusCondition: StatusCondition.Poison,
    });
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      speedRank: -1,
    });
  });

  it.each([
    ['どく', 'どく'],
    ['はがね', 'はがね'],
  ])('%sタイプにはどくを付与せず、すばやさのみ下げる', async (_label, typeName) => {
    const effect = new ToxicThreadEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext({ defenderPrimaryType: typeName });

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toBe('Speed fell!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalledWith(defender.id, {
      statusCondition: StatusCondition.Poison,
    });
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      speedRank: -1,
    });
  });

  it('既に状態異常がある場合はどくを付与せず、すばやさのみ下げる', async () => {
    const effect = new ToxicThreadEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2, statusCondition: StatusCondition.Burn });
    const ctx = createBattleContext();

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toBe('Speed fell!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalledWith(defender.id, {
      statusCondition: StatusCondition.Poison,
    });
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      speedRank: -1,
    });
  });

  it('すばやさが既に -6 のときは下げない（どくのみ付与）', async () => {
    const effect = new ToxicThreadEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2, speedRank: -6 });
    const ctx = createBattleContext();

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toBe('was poisoned!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      statusCondition: StatusCondition.Poison,
    });
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalledWith(defender.id, {
      speedRank: expect.any(Number),
    });
  });

  it('battleRepository が無い場合は null', async () => {
    const effect = new ToxicThreadEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx: BattleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    };

    const result = await effect.onUse(attacker, defender, ctx);

    expect(result).toBeNull();
  });

  describe('どくの付与（canInflictStatus / inflictStatus）', () => {
    beforeEach(() => {
      AbilityRegistry.clear();
      AbilityRegistry.initialize();
    });

    afterEach(() => {
      AbilityRegistry.clear();
      AbilityRegistry.initialize();
    });

    it('付与したら、付与された側の特性に技と使用者を付与元として渡し、メッセージを足す', async () => {
      // Arrange
      const onStatusInflicted = jest.fn().mockResolvedValue('Test ability activated!');
      AbilityRegistry.register('テストシンクロ', { onStatusInflicted });
      const { context, get } = createInMemoryBattle({}, { ability: 'テストシンクロ' });

      // Act
      const result = await new ToxicThreadEffect().onUse(
        get(1),
        get(2),
        context({ moveName: 'どくのいと' }),
      );

      // Assert
      expect(result).toBe('was poisoned! Test ability activated! Speed fell!');
      const source = onStatusInflicted.mock.calls[0][2];
      expect(source).toEqual(expect.objectContaining({ kind: 'move', name: 'どくのいと' }));
      expect(source.pokemon.id).toBe(1);
    });

    it('相手がシンクロなら、使用者もどくになる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { ability: 'シンクロ' });

      // Act
      const result = await new ToxicThreadEffect().onUse(get(1), get(2), context());

      // Assert
      expect(get(2).statusCondition).toBe(StatusCondition.Poison);
      expect(get(1).statusCondition).toBe(StatusCondition.Poison);
      expect(result).toBe('was poisoned! Synchronize activated! Speed fell!');
    });

    it('相手の特性で防がれるなら、どくにせず、すばやさのみ下げる', async () => {
      // Arrange
      AbilityRegistry.register('テストめんえき', { canReceiveStatusCondition: () => false });
      const { context, get } = createInMemoryBattle({}, { ability: 'テストめんえき' });

      // Act
      const result = await new ToxicThreadEffect().onUse(get(1), get(2), context());

      // Assert
      expect(result).toBe('Speed fell!');
      expect(get(2).statusCondition).toBeNull();
      expect(get(2).speedRank).toBe(-1);
    });
  });
});
