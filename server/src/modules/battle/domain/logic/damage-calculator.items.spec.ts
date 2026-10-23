import { DamageCalculator, DamageCalculationParams } from './damage-calculator';
import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '../entities/battle.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { ItemRegistry } from '@/modules/pokemon/domain/items/item-registry';

describe('DamageCalculator - 持ち物', () => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
  const NORMAL = new Type(1, 'ノーマル', 'Normal');
  const FIGHTING = new Type(3, 'かくとう', 'Fighting');

  const createStatus = (id: number, item?: string): BattlePokemonStatus =>
    new BattlePokemonStatus(
      id,
      1,
      id,
      id,
      true,
      100,
      100,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      null,
      {},
      item === undefined ? {} : { item },
    );

  const stats = {
    attack: 100,
    defense: 100,
    specialAttack: 100,
    specialDefense: 100,
    speed: 100,
  };

  const createParams = (overrides?: Partial<DamageCalculationParams>): DamageCalculationParams => ({
    attacker: createStatus(1),
    defender: createStatus(2),
    move: { power: 100, typeId: FIGHTING.id, category: 'Physical', accuracy: 100 },
    moveType: FIGHTING,
    attackerTypes: { primary: NORMAL, secondary: null },
    defenderTypes: { primary: NORMAL, secondary: null },
    typeEffectiveness: new Map([['3-1', 2]]),
    weather: null,
    field: null,
    attackerStats: stats,
    defenderStats: stats,
    battle,
    ...overrides,
  });

  beforeEach(() => {
    ItemRegistry.initialize();
  });

  it('攻撃側の持ち物が威力を変えると、その威力でダメージを計算する（modifyBasePower）', async () => {
    // Arrange
    ItemRegistry.register('テストの威力アップ', { modifyBasePower: () => 120 });
    const expected = await DamageCalculator.calculate(
      createParams({ move: { power: 120, typeId: 3, category: 'Physical', accuracy: 100 } }),
    );

    // Act
    const damage = await DamageCalculator.calculate(
      createParams({ attacker: createStatus(1, 'テストの威力アップ') }),
    );

    // Assert
    expect(damage).toBe(expected);
  });

  it('攻撃側の持ち物が与えるダメージを変える（modifyDamageDealt）', async () => {
    // Arrange
    ItemRegistry.register('テストの与ダメージ2倍', {
      modifyDamageDealt: (_pokemon, damage) => damage * 2,
    });
    const base = await DamageCalculator.calculate(createParams());

    // Act
    const damage = await DamageCalculator.calculate(
      createParams({ attacker: createStatus(1, 'テストの与ダメージ2倍') }),
    );

    // Assert
    expect(damage).toBe(base * 2);
  });

  it('防御側の持ち物が受けるダメージを変える（modifyDamage）', async () => {
    // Arrange
    ItemRegistry.register('テストの被ダメージ半分', {
      modifyDamage: (_pokemon, damage) => damage / 2,
    });
    const base = await DamageCalculator.calculate(createParams());

    // Act
    const damage = await DamageCalculator.calculate(
      createParams({ defender: createStatus(2, 'テストの被ダメージ半分') }),
    );

    // Assert
    expect(damage).toBe(Math.floor(base / 2));
  });

  it('攻撃側の持ち物は、防御側のダメージの補正には使わない', async () => {
    // Arrange
    ItemRegistry.register('テストの被ダメージ半分', {
      modifyDamage: (_pokemon, damage) => damage / 2,
    });
    const base = await DamageCalculator.calculate(createParams());

    // Act
    const damage = await DamageCalculator.calculate(
      createParams({ attacker: createStatus(1, 'テストの被ダメージ半分') }),
    );

    // Assert
    expect(damage).toBe(base);
  });
});
