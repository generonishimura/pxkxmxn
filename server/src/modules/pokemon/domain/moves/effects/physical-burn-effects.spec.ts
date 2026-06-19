import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { IMoveEffect } from '../move-effect.interface';
import { FirePunchEffect } from './fire-punch-effect';
import { FlameWheelEffect } from './flame-wheel-effect';
import { SacredFireEffect } from './sacred-fire-effect';
import { BlazeKickEffect } from './blaze-kick-effect';
import { FlareBlitzEffect } from './flare-blitz-effect';
import { PyroBallEffect } from './pyro-ball-effect';

/**
 * 物理カテゴリやけど付与系の技（Issue #123）の設定検証
 * BaseStatusConditionEffect 拡張の確率・免疫タイプ・メッセージを検証する
 */
describe('物理カテゴリやけど付与の技効果（Issue #123）', () => {
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

  const createBattleContext = (defenderTypeName = 'ノーマル'): BattleContext => {
    const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
    const mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    };
    const mockTrainedPokemonRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 1,
        pokemon: { id: 1, primaryType: { name: defenderTypeName }, secondaryType: null },
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

  type EffectCase = {
    name: string;
    effect: IMoveEffect;
    expectedChance: number;
    randomBelow: number; // この値で確率判定を通る
    randomAbove: number; // この値で確率判定を外す
  };

  const cases: EffectCase[] = [
    { name: 'ほのおのパンチ', effect: new FirePunchEffect(), expectedChance: 0.1, randomBelow: 0.05, randomAbove: 0.5 },
    { name: 'かえんぐるま', effect: new FlameWheelEffect(), expectedChance: 0.1, randomBelow: 0.05, randomAbove: 0.5 },
    { name: 'せいなるほのお', effect: new SacredFireEffect(), expectedChance: 0.5, randomBelow: 0.2, randomAbove: 0.8 },
    { name: 'ブレイズキック', effect: new BlazeKickEffect(), expectedChance: 0.1, randomBelow: 0.05, randomAbove: 0.5 },
    { name: 'フレアドライブ', effect: new FlareBlitzEffect(), expectedChance: 0.1, randomBelow: 0.05, randomAbove: 0.5 },
    { name: 'かえんボール', effect: new PyroBallEffect(), expectedChance: 0.1, randomBelow: 0.05, randomAbove: 0.5 },
  ];

  it.each(cases)('$name は確率内でやけどを付与する', async ({ effect, randomBelow }) => {
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    jest.spyOn(Math, 'random').mockReturnValue(randomBelow);
    const result = await effect.onHit!(attacker, defender, ctx);

    expect(result).toBe('was burned!');
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      statusCondition: StatusCondition.Burn,
    });
    jest.restoreAllMocks();
  });

  it.each(cases)('$name は確率外ではやけどを付与しない', async ({ effect, expectedChance, randomAbove }) => {
    if (expectedChance >= 1.0) {
      return; // chance=1.0 のものはスキップ
    }
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext();

    jest.spyOn(Math, 'random').mockReturnValue(randomAbove);
    const result = await effect.onHit!(attacker, defender, ctx);

    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it.each(cases)('$name はほのおタイプには付与しない', async ({ effect, randomBelow }) => {
    const attacker = createBattlePokemonStatus();
    const defender = createBattlePokemonStatus({ id: 2 });
    const ctx = createBattleContext('ほのお');

    jest.spyOn(Math, 'random').mockReturnValue(randomBelow);
    const result = await effect.onHit!(attacker, defender, ctx);

    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});
