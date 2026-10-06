import { TriAttackEffect } from './tri-attack-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { MoldBreakerEffect } from '../../abilities/effects/mold-breaker-effect';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('TriAttackEffect', () => {
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
    battleRepository?: BattleContext['battleRepository'] | null;
    trainedPokemonRepository?: BattleContext['trainedPokemonRepository'] | null;
    attackerAbilityName?: string;
  }): BattleContext => {
    const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
    const mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    };
    const mockTrainedPokemonRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 1,
        pokemon: { id: 1, primaryType: { name: 'ノーマル' }, secondaryType: null },
        ability: null,
      }),
    };
    const battleRepository =
      overrides && 'battleRepository' in overrides
        ? overrides.battleRepository
        : mockBattleRepository;
    const trainedPokemonRepository =
      overrides && 'trainedPokemonRepository' in overrides
        ? overrides.trainedPokemonRepository
        : mockTrainedPokemonRepository;
    return {
      battle,
      battleRepository: battleRepository as BattleContext['battleRepository'],
      trainedPokemonRepository:
        trainedPokemonRepository as BattleContext['trainedPokemonRepository'],
      attackerAbilityName: overrides?.attackerAbilityName,
    };
  };

  const TRI_ATTACK_MESSAGES = ['was burned!', 'was frozen solid!', 'was paralyzed!'] as const;
  const TRI_ATTACK_STATUSES = [
    StatusCondition.Burn,
    StatusCondition.Freeze,
    StatusCondition.Paralysis,
  ] as const;

  it('20%の確率でやけど・こおり・まひのいずれか1つを付与する', async () => {
    const effect = new TriAttackEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus();
    const ctx = createBattleContext();

    jest.spyOn(Math, 'random').mockReturnValue(0.1); // 20% を通過

    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).not.toBeNull();
    expect(TRI_ATTACK_MESSAGES).toContain(result);
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledTimes(1);
    const [[_id, update]] = (ctx.battleRepository?.updateBattlePokemonStatus as jest.Mock).mock
      .calls;
    expect(TRI_ATTACK_STATUSES).toContain(update.statusCondition);

    jest.restoreAllMocks();
  });

  it('既に状態異常がある場合は付与しない', async () => {
    const effect = new TriAttackEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ statusCondition: StatusCondition.Poison });
    const ctx = createBattleContext();

    jest.spyOn(Math, 'random').mockReturnValue(0.1);

    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('確率に外れた場合は付与しない', async () => {
    const effect = new TriAttackEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus();
    const ctx = createBattleContext();

    jest.spyOn(Math, 'random').mockReturnValue(0.5); // 20% を外す

    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('battleRepository が無い場合は null', async () => {
    const effect = new TriAttackEffect();
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus();
    const ctx = createBattleContext({ battleRepository: undefined });

    const result = await effect.onHit(attacker, defender, ctx);

    expect(result).toBeNull();
  });

  describe('状態異常の付与（canInflictStatus / inflictStatus）', () => {
    beforeEach(() => {
      AbilityRegistry.clear();
      AbilityRegistry.initialize();
    });

    afterEach(() => {
      jest.restoreAllMocks();
      AbilityRegistry.clear();
      AbilityRegistry.initialize();
    });

    it('付与したら、付与された側の特性（シンクロ）に技と使用者を付与元として渡す', async () => {
      // Arrange
      const onStatusInflicted = jest.fn().mockResolvedValue('Synchronize activated!');
      AbilityRegistry.register('テストシンクロ', { onStatusInflicted });
      const { context, get } = createInMemoryBattle({}, { ability: 'テストシンクロ' });
      jest.spyOn(Math, 'random').mockReturnValue(0.1); // 20% を通過し、1つ目（やけど）を選ぶ

      // Act
      const result = await new TriAttackEffect().onHit(
        get(1),
        get(2),
        context({ moveName: 'トライアタック' }),
      );

      // Assert
      expect(get(2).statusCondition).toBe(StatusCondition.Burn);
      expect(result).toBe('was burned! Synchronize activated!');
      const source = onStatusInflicted.mock.calls[0][2];
      expect(source).toEqual(expect.objectContaining({ kind: 'move', name: 'トライアタック' }));
      expect(source.pokemon.id).toBe(1);
    });

    it('選ばれた状態異常に免疫があれば、ほかの状態異常は付与しない（本家と同じ）', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { types: ['ほのお'] });
      jest.spyOn(Math, 'random').mockReturnValue(0.1); // やけどを選ぶ

      // Act
      const result = await new TriAttackEffect().onHit(get(1), get(2), context());

      // Assert
      expect(result).toBeNull();
      expect(get(2).statusCondition).toBeNull();
    });

    it('使用者がかたやぶりなら、相手の状態異常を防ぐ特性を無視する', async () => {
      // Arrange
      AbilityRegistry.register('テストみずのベール', { canReceiveStatusCondition: () => false });
      AbilityRegistry.register('テストかたやぶり', new MoldBreakerEffect());
      const { context, get } = createInMemoryBattle(
        { ability: 'テストかたやぶり' },
        { ability: 'テストみずのベール' },
      );
      jest.spyOn(Math, 'random').mockReturnValue(0.1);

      // Act
      await new TriAttackEffect().onHit(
        get(1),
        get(2),
        context({ attackerAbilityName: 'テストかたやぶり' }),
      );

      // Assert
      expect(get(2).statusCondition).toBe(StatusCondition.Burn);
    });
  });
});
