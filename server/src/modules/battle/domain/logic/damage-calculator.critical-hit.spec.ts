import { DamageCalculator, DamageCalculationParams } from './damage-calculator';
import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '../entities/battle.entity';
import { SideState } from '../state/side-state';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { BattleStatValues } from '@/modules/pokemon/domain/abilities/battle-context.interface';

/**
 * 急所のダメージ（battleContext.isCriticalHit）
 * 威力 100・能力 100 同士・タイプ一致なし・等倍なら、ダメージは 46。急所なら floor(46 * 1.5) = 69
 */
describe('DamageCalculator - 急所', () => {
  const NORMAL = new Type(1, 'ノーマル', 'Normal');
  const FIRE = new Type(3, 'ほのお', 'Fire');

  const stats: BattleStatValues = {
    attack: 100,
    defense: 100,
    specialAttack: 100,
    specialDefense: 100,
    speed: 100,
  };

  const createStatus = (
    id: number,
    trainerId: number,
    ranks: { attack?: number; defense?: number } = {},
  ): BattlePokemonStatus =>
    new BattlePokemonStatus(
      id,
      1,
      id,
      trainerId,
      true,
      100,
      100,
      ranks.attack ?? 0,
      ranks.defense ?? 0,
      0,
      0,
      0,
      0,
      0,
      null,
    );

  const createParams = (
    options: {
      isCriticalHit?: boolean;
      attackerAttackRank?: number;
      defenderDefenseRank?: number;
      sideState?: SideState;
    } = {},
  ): DamageCalculationParams => {
    const battle = new Battle(
      1,
      1,
      2,
      1,
      2,
      1,
      null,
      null,
      BattleStatus.Active,
      null,
      options.sideState ?? {},
    );
    return {
      attacker: createStatus(1, 1, { attack: options.attackerAttackRank }),
      defender: createStatus(2, 2, { defense: options.defenderDefenseRank }),
      move: { power: 100, typeId: FIRE.id, category: 'Physical', accuracy: 100 },
      moveType: FIRE,
      attackerTypes: { primary: NORMAL, secondary: null },
      defenderTypes: { primary: NORMAL, secondary: null },
      typeEffectiveness: new Map(),
      weather: null,
      field: null,
      attackerStats: stats,
      defenderStats: stats,
      battle,
      battleContext: { battle, moveName: 'テスト技', isCriticalHit: options.isCriticalHit },
    };
  };

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('急所ならダメージが 1.5 倍（切り捨て）になる', async () => {
    // Arrange
    const params = createParams({ isCriticalHit: true });

    // Act
    const damage = await DamageCalculator.calculate(params);

    // Assert
    expect(damage).toBe(69);
  });

  it('急所でなければダメージは変わらない', async () => {
    // Arrange
    const params = createParams({ isCriticalHit: false });

    // Act
    const damage = await DamageCalculator.calculate(params);

    // Assert
    expect(damage).toBe(46);
  });

  it('急所なら、攻撃側の下がった攻撃ランクを 0 として扱う', async () => {
    // Arrange
    const params = createParams({ isCriticalHit: true, attackerAttackRank: -1 });

    // Act
    const damage = await DamageCalculator.calculate(params);

    // Assert
    expect(damage).toBe(69);
  });

  it('急所でも、攻撃側の上がった攻撃ランクはそのまま使う', async () => {
    // Arrange
    const params = createParams({ isCriticalHit: true, attackerAttackRank: 1 });

    // Act
    const damage = await DamageCalculator.calculate(params);

    // Assert
    // 攻撃 150: floor(floor(22 * 100 * 150 / 100) / 50) + 2 = 68 → floor(68 * 1.5) = 102
    expect(damage).toBe(102);
  });

  it('急所なら、防御側の上がった防御ランクを 0 として扱う', async () => {
    // Arrange
    const params = createParams({ isCriticalHit: true, defenderDefenseRank: 2 });

    // Act
    const damage = await DamageCalculator.calculate(params);

    // Assert
    expect(damage).toBe(69);
  });

  it('急所でも、防御側の下がった防御ランクはそのまま使う', async () => {
    // Arrange
    const params = createParams({ isCriticalHit: true, defenderDefenseRank: -2 });

    // Act
    const damage = await DamageCalculator.calculate(params);

    // Assert
    // 防御 50: floor(floor(22 * 100 * 100 / 50) / 50) + 2 = 90 → floor(90 * 1.5) = 135
    expect(damage).toBe(135);
  });

  it('急所なら、相手の陣営のリフレクターで半分にならない', async () => {
    // Arrange
    const params = createParams({
      isCriticalHit: true,
      sideState: { sides: { '2': { reflectTurns: 3 } } },
    });

    // Act
    const damage = await DamageCalculator.calculate(params);

    // Assert
    expect(damage).toBe(69);
  });
});
