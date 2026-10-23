import { DamageCalculator, DamageCalculationParams } from './damage-calculator';
import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '../entities/battle.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';

describe('DamageCalculator - 技によるタイプ相性の上書き（typeEffectivenessOverrides。フリーズドライ）', () => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
  const NORMAL = new Type(1, 'ノーマル', 'Normal');
  const ICE = new Type(15, 'こおり', 'Ice');
  const WATER = new Type(11, 'みず', 'Water');
  const GROUND = new Type(5, 'じめん', 'Ground');
  const FIRE = new Type(10, 'ほのお', 'Fire');

  const createStatus = (id: number): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const stats = { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 };

  const createParams = (
    defenderTypes: { primary: Type; secondary: Type | null },
    overrides?: Readonly<Record<string, number>>,
  ): DamageCalculationParams => ({
    attacker: createStatus(1),
    defender: createStatus(2),
    move: { power: 70, typeId: ICE.id, category: 'Special', accuracy: 100 },
    moveType: ICE,
    attackerTypes: { primary: NORMAL, secondary: null },
    defenderTypes,
    typeEffectiveness: new Map([
      ['15-11', 0.5], // こおり → みず
      ['15-5', 2], // こおり → じめん
      ['15-10', 0.5], // こおり → ほのお
    ]),
    weather: null,
    field: null,
    attackerStats: stats,
    defenderStats: stats,
    battle,
    battleContext: { battle, moveName: 'フリーズドライ' },
    typeEffectivenessOverrides: overrides,
  });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('上書きしたタイプへの相性は、表ではなく上書きの値を使う（みずに 2 倍）', () => {
    // Act
    const effectiveness = DamageCalculator.calculateMoveEffectiveness(
      createParams({ primary: WATER, secondary: null }, { みず: 2 }),
    );

    // Assert
    expect(effectiveness).toBe(2);
  });

  it('もう一方のタイプには表の相性を掛ける（みず・じめんは 4 倍）', () => {
    // Act
    const effectiveness = DamageCalculator.calculateMoveEffectiveness(
      createParams({ primary: WATER, secondary: GROUND }, { みず: 2 }),
    );

    // Assert
    expect(effectiveness).toBe(4);
  });

  it('上書きのないタイプは、表の相性のまま（ほのおは 0.5 倍）', () => {
    // Act
    const effectiveness = DamageCalculator.calculateMoveEffectiveness(
      createParams({ primary: FIRE, secondary: null }, { みず: 2 }),
    );

    // Assert
    expect(effectiveness).toBe(0.5);
  });

  it('上書きがなければ、表の相性のまま（みずに 0.5 倍）', () => {
    // Act
    const effectiveness = DamageCalculator.calculateMoveEffectiveness(
      createParams({ primary: WATER, secondary: null }),
    );

    // Assert
    expect(effectiveness).toBe(0.5);
  });

  it('ダメージ計算にも上書きした相性を使う', async () => {
    // Arrange
    const resisted = await DamageCalculator.calculate(
      createParams({ primary: WATER, secondary: null }),
    );

    // Act
    const overridden = await DamageCalculator.calculate(
      createParams({ primary: WATER, secondary: null }, { みず: 2 }),
    );

    // Assert
    expect(overridden).toBeGreaterThan(resisted * 3);
  });
});
