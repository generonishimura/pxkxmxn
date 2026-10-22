import { ChipAwayEffect } from './chip-away-effect';
import {
  DamageCalculator,
  DamageCalculationParams,
} from '@/modules/battle/domain/logic/damage-calculator';
import { AccuracyCalculator } from '@/modules/battle/domain/logic/accuracy-calculator';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { StatType } from './base/base-stat-change-effect';
import { Type } from '../../entities/type.entity';

describe('ChipAwayEffect', () => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
  const NORMAL = new Type(1, 'ノーマル', 'Normal');
  const createStatus = (overrides: Partial<BattlePokemonStatus> & { id: number }) =>
    new BattlePokemonStatus(
      overrides.id,
      1,
      overrides.id,
      overrides.id,
      true,
      100,
      100,
      0,
      overrides.defenseRank ?? 0,
      0,
      0,
      0,
      0,
      overrides.evasionRank ?? 0,
      null,
    );
  const stats = {
    attack: 100,
    defense: 100,
    specialAttack: 100,
    specialDefense: 100,
    speed: 100,
  };

  const createParams = (
    defender: BattlePokemonStatus,
    ignoredDefenderRanks?: ReadonlySet<StatType>,
  ): DamageCalculationParams => ({
    attacker: createStatus({ id: 1 }),
    defender,
    move: { power: 70, typeId: NORMAL.id, category: 'Physical', accuracy: 100 },
    moveType: NORMAL,
    attackerTypes: { primary: NORMAL, secondary: null },
    defenderTypes: { primary: NORMAL, secondary: null },
    typeEffectiveness: new Map(),
    weather: null,
    field: null,
    attackerStats: stats,
    defenderStats: stats,
    battle,
    battleContext: ignoredDefenderRanks ? { battle, ignoredDefenderRanks } : undefined,
  });

  beforeEach(() => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('相手の防御・特防・回避のランクを無視する', () => {
    // Arrange
    const effect = new ChipAwayEffect();

    // Act
    const ignored = [...effect.ignoredDefenderRanks].sort();

    // Assert
    expect(ignored).toEqual(['defense', 'evasion', 'specialDefense']);
  });

  it('相手の防御ランクが上がっていても、ランク0と同じダメージになる', async () => {
    // Arrange
    const effect = new ChipAwayEffect();
    const expected = await DamageCalculator.calculate(createParams(createStatus({ id: 2 })));

    // Act
    const damage = await DamageCalculator.calculate(
      createParams(createStatus({ id: 2, defenseRank: 6 }), new Set(effect.ignoredDefenderRanks)),
    );

    // Assert
    expect(damage).toBe(expected);
  });

  it('相手の回避ランクが上がっていても、回避ランク0として命中判定する', () => {
    // Arrange
    const effect = new ChipAwayEffect();

    // Act
    const hit = AccuracyCalculator.checkHit(
      100,
      createStatus({ id: 1 }),
      createStatus({ id: 2, evasionRank: 6 }),
      undefined,
      undefined,
      { battle, ignoredDefenderRanks: new Set(effect.ignoredDefenderRanks) },
    );

    // Assert
    expect(hit).toBe(true);
  });
});
