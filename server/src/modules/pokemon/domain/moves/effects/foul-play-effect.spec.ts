import { FoulPlayEffect } from './foul-play-effect';
import {
  DamageCalculator,
  DamageCalculationParams,
} from '@/modules/battle/domain/logic/damage-calculator';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { Type } from '../../entities/type.entity';

describe('FoulPlayEffect', () => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
  const DARK = new Type(17, 'あく', 'Dark');
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
      overrides.attackRank ?? 0,
      0,
      0,
      0,
      0,
      0,
      0,
      overrides.statusCondition ?? null,
    );
  const stats = (attack: number) => ({
    attack,
    defense: 100,
    specialAttack: 100,
    specialDefense: 100,
    speed: 100,
  });

  const createParams = (
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    attackerAttack: number,
    defenderAttack: number,
    effect?: FoulPlayEffect,
  ): DamageCalculationParams => ({
    attacker,
    defender,
    move: { power: 95, typeId: DARK.id, category: 'Physical', accuracy: 100 },
    moveType: DARK,
    attackerTypes: { primary: NORMAL, secondary: null },
    defenderTypes: { primary: NORMAL, secondary: null },
    typeEffectiveness: new Map(),
    weather: null,
    field: null,
    attackerStats: stats(attackerAttack),
    defenderStats: stats(defenderAttack),
    battle,
    attackStatOverride: effect?.attackStatOverride,
  });

  beforeEach(() => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('攻撃に使う能力の参照先が相手の攻撃である', () => {
    // Arrange
    const effect = new FoulPlayEffect();

    // Act
    const override = effect.attackStatOverride;

    // Assert
    expect(override).toEqual({ source: 'defender', stat: 'attack' });
  });

  it('自分ではなく相手の攻撃の実数値とランクでダメージを計算する', async () => {
    // Arrange
    const effect = new FoulPlayEffect();
    const user = createStatus({ id: 1, attackRank: -6 });
    const target = createStatus({ id: 2, attackRank: 2 });
    const expected = await DamageCalculator.calculate(
      createParams(createStatus({ id: 1, attackRank: 2 }), createStatus({ id: 2 }), 250, 50),
    );

    // Act
    const damage = await DamageCalculator.calculate(createParams(user, target, 50, 250, effect));

    // Assert
    expect(damage).toBe(expected);
  });

  it('自分がやけどのときは、相手の攻撃を半分にして計算する', async () => {
    // Arrange
    const effect = new FoulPlayEffect();
    const target = createStatus({ id: 2 });
    const expected = await DamageCalculator.calculate(
      createParams(createStatus({ id: 1 }), target, 50, 125, effect),
    );

    // Act
    const burned = await DamageCalculator.calculate(
      createParams(
        createStatus({ id: 1, statusCondition: StatusCondition.Burn }),
        target,
        50,
        250,
        effect,
      ),
    );

    // Assert
    expect(burned).toBe(expected);
  });
});
