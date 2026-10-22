import {
  DamageCalculator,
  DamageCalculationParams,
} from '@/modules/battle/domain/logic/damage-calculator';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';
import { Type } from '../../../entities/type.entity';
import { AbilityRegistry } from '../../ability-registry';

/**
 * タイプ相性で発動する特性（ふしぎなまもり・いろめがね・フィルター・ハードロック・
 * プリズムアーマー・ブレインフォース）を、DamageCalculator を通して確かめる
 */
describe('タイプ相性で発動する特性（DamageCalculator 経由）', () => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
  const NORMAL = new Type(1, 'ノーマル', 'Normal');
  const FIGHTING = new Type(3, 'かくとう', 'Fighting');

  const createStatus = (id: number): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const stats = {
    attack: 100,
    defense: 100,
    specialAttack: 100,
    specialDefense: 100,
    speed: 100,
  };

  /**
   * かくとう技でノーマルタイプを攻撃する（タイプ一致なし）
   * effectiveness でかくとう → ノーマルの相性を決める
   */
  const createParams = (
    effectiveness: number,
    overrides?: Partial<DamageCalculationParams>,
  ): DamageCalculationParams => ({
    attacker: createStatus(1),
    defender: createStatus(2),
    move: { power: 100, typeId: FIGHTING.id, category: 'Physical', accuracy: 100 },
    moveType: FIGHTING,
    attackerTypes: { primary: NORMAL, secondary: null },
    defenderTypes: { primary: NORMAL, secondary: null },
    typeEffectiveness: new Map([[`${FIGHTING.id}-${NORMAL.id}`, effectiveness]]),
    weather: null,
    field: null,
    attackerStats: stats,
    defenderStats: stats,
    battle,
    battleContext: { battle, moveName: 'テスト技' },
    ...overrides,
  });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('ふしぎなまもり', () => {
    it('効果ばつぐんの技はダメージを受ける', async () => {
      // Arrange
      const expected = await DamageCalculator.calculate(createParams(2));

      // Act
      const damage = await DamageCalculator.calculate(
        createParams(2, { defenderAbilityName: 'ふしぎなまもり' }),
      );

      // Assert
      expect(damage).toBe(expected);
      expect(damage).toBeGreaterThan(0);
    });

    it('等倍の技はダメージを受けない', async () => {
      // Act
      const damage = await DamageCalculator.calculate(
        createParams(1, { defenderAbilityName: 'ふしぎなまもり' }),
      );

      // Assert
      expect(damage).toBe(0);
    });

    it('技全体のタイプ相性も0になる', () => {
      // Act
      const effectiveness = DamageCalculator.calculateMoveEffectiveness(
        createParams(0.5, { defenderAbilityName: 'ふしぎなまもり' }),
      );

      // Assert
      expect(effectiveness).toBe(0);
    });

    it('かたやぶりの攻撃は等倍でも当たる', async () => {
      // Arrange
      const expected = await DamageCalculator.calculate(createParams(1));

      // Act
      const damage = await DamageCalculator.calculate(
        createParams(1, {
          attackerAbilityName: 'かたやぶり',
          defenderAbilityName: 'ふしぎなまもり',
        }),
      );

      // Assert
      expect(damage).toBe(expected);
    });
  });

  describe('いろめがね', () => {
    it('いまひとつの技のダメージが等倍と同じになる', async () => {
      // Arrange
      const neutral = await DamageCalculator.calculate(createParams(1));

      // Act
      const damage = await DamageCalculator.calculate(
        createParams(0.5, { attackerAbilityName: 'いろめがね' }),
      );

      // Assert
      expect(damage).toBe(neutral);
    });

    it('等倍の技のダメージは変えない', async () => {
      // Arrange
      const expected = await DamageCalculator.calculate(createParams(1));

      // Act
      const damage = await DamageCalculator.calculate(
        createParams(1, { attackerAbilityName: 'いろめがね' }),
      );

      // Assert
      expect(damage).toBe(expected);
    });
  });

  describe('ブレインフォース', () => {
    it('効果ばつぐんの技のダメージを1.25倍にする', async () => {
      // Arrange
      const base = await DamageCalculator.calculate(createParams(2));

      // Act
      const damage = await DamageCalculator.calculate(
        createParams(2, { attackerAbilityName: 'ブレインフォース' }),
      );

      // Assert
      expect(damage).toBe(modifyByFixedPoint(base, 5120));
    });
  });

  describe.each(['フィルター', 'ハードロック', 'プリズムアーマー'])('%s', abilityName => {
    it('効果ばつぐんの技のダメージを0.75倍にする', async () => {
      // Arrange
      const base = await DamageCalculator.calculate(createParams(2));

      // Act
      const damage = await DamageCalculator.calculate(
        createParams(2, { defenderAbilityName: abilityName }),
      );

      // Assert
      expect(damage).toBe(modifyByFixedPoint(base, 3072));
    });

    it('等倍の技のダメージは変えない', async () => {
      // Arrange
      const expected = await DamageCalculator.calculate(createParams(1));

      // Act
      const damage = await DamageCalculator.calculate(
        createParams(1, { defenderAbilityName: abilityName }),
      );

      // Assert
      expect(damage).toBe(expected);
    });
  });

  it.each(['フィルター', 'ハードロック'])('%s はかたやぶりで無視される', async abilityName => {
    // Arrange
    const expected = await DamageCalculator.calculate(createParams(2));

    // Act
    const damage = await DamageCalculator.calculate(
      createParams(2, { attackerAbilityName: 'かたやぶり', defenderAbilityName: abilityName }),
    );

    // Assert
    expect(damage).toBe(expected);
  });

  it('プリズムアーマーはかたやぶりでも0.75倍にする', async () => {
    // Arrange
    const base = await DamageCalculator.calculate(createParams(2));

    // Act
    const damage = await DamageCalculator.calculate(
      createParams(2, {
        attackerAbilityName: 'かたやぶり',
        defenderAbilityName: 'プリズムアーマー',
      }),
    );

    // Assert
    expect(damage).toBe(modifyByFixedPoint(base, 3072));
  });
});
