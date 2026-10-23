import { DamageCalculator, DamageCalculationParams } from './damage-calculator';
import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '../entities/battle.entity';
import { SideState } from '../state/side-state';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { BattleStatValues } from '@/modules/pokemon/domain/abilities/battle-context.interface';

/**
 * まもる系を特性（ふかしのこぶし）で通り抜けたときのダメージ（battleContext.brokeThroughProtection）
 * 威力 100・能力 100 同士・タイプ一致なし・等倍なら、ダメージは 46
 */
describe('DamageCalculator - まもる系を通り抜けたときのダメージ', () => {
  const NORMAL = new Type(1, 'ノーマル', 'Normal');
  const FIRE = new Type(3, 'ほのお', 'Fire');

  const stats: BattleStatValues = {
    attack: 100,
    defense: 100,
    specialAttack: 100,
    specialDefense: 100,
    speed: 100,
  };

  const createStatus = (id: number, trainerId: number): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, trainerId, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createParams = (
    options: { brokeThroughProtection?: boolean; power?: number; sideState?: SideState } = {},
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
      attacker: createStatus(1, 1),
      defender: createStatus(2, 2),
      move: { power: options.power ?? 100, typeId: FIRE.id, category: 'Physical', accuracy: 100 },
      moveType: FIRE,
      attackerTypes: { primary: NORMAL, secondary: null },
      defenderTypes: { primary: NORMAL, secondary: null },
      typeEffectiveness: new Map(),
      weather: null,
      field: null,
      attackerStats: stats,
      defenderStats: stats,
      battle,
      battleContext: {
        battle,
        moveName: 'テスト技',
        brokeThroughProtection: options.brokeThroughProtection,
      },
    };
  };

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('通り抜けたときは、ダメージが 1/4 になる（チャンピオンズの値。SV は等倍）', async () => {
    // Arrange
    const params = createParams({ brokeThroughProtection: true });

    // Act
    const damage = await DamageCalculator.calculate(params);

    // Assert
    // 46 × 1024/4096 = 11.5 → 11（4096 分率の五捨五超入）
    expect(damage).toBe(11);
  });

  it('通り抜けていなければ、ダメージは変わらない', async () => {
    // Arrange
    const params = createParams({ brokeThroughProtection: false });

    // Act
    const damage = await DamageCalculator.calculate(params);

    // Assert
    expect(damage).toBe(46);
  });

  it('壁のあとに 1/4 を掛ける', async () => {
    // Arrange
    const params = createParams({
      brokeThroughProtection: true,
      sideState: { sides: { '2': { reflectTurns: 3 } } },
    });

    // Act
    const damage = await DamageCalculator.calculate(params);

    // Assert
    // 46 → リフレクターで 23 → 1/4 で 5.75 → 6
    expect(damage).toBe(6);
  });

  it('1/4 にしても、ダメージは最低 1', async () => {
    // Arrange
    // 威力 1: floor(floor(22 * 1 * 100 / 100) / 50) + 2 = 2 → 1/4 で 0 になるが 1 にする
    const params = createParams({ brokeThroughProtection: true, power: 1 });

    // Act
    const damage = await DamageCalculator.calculate(params);

    // Assert
    expect(damage).toBe(1);
  });
});
