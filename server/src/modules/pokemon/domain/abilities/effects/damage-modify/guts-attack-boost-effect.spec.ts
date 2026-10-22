import { GutsAttackBoostEffect } from './guts-attack-boost-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../../battle-context.interface';
import { AbilityRegistry } from '../../ability-registry';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import {
  DamageCalculator,
  DamageCalculationParams,
} from '@/modules/battle/domain/logic/damage-calculator';

describe('GutsAttackBoostEffect（こんじょう）', () => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);

  const createStatus = (statusCondition: StatusCondition | null): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, statusCondition);

  const createCtx = (
    moveCategory: 'Physical' | 'Special' | 'Status',
    moveName = 'テスト技',
  ): BattleContext => ({ battle, moveCategory, moveName });

  let effect: GutsAttackBoostEffect;

  beforeEach(() => {
    effect = new GutsAttackBoostEffect();
  });

  describe('modifyBasePower', () => {
    it.each([
      ['まひ', StatusCondition.Paralysis],
      ['どく', StatusCondition.Poison],
      ['もうどく', StatusCondition.BadPoison],
      ['ねむり', StatusCondition.Sleep],
    ])('%s のとき、物理技の威力を1.5倍にする', (_label, status) => {
      // Arrange
      const pokemon = createStatus(status);

      // Act
      const result = effect.modifyBasePower(pokemon, 80, createCtx('Physical'));

      // Assert
      expect(result).toBe(120);
    });

    it('こおりのまま技を出すときは、こおりが治ったあとなので威力を変えない', () => {
      // Arrange
      const pokemon = createStatus(StatusCondition.Freeze);

      // Act
      const result = effect.modifyBasePower(pokemon, 80, createCtx('Physical'));

      // Assert
      expect(result).toBeUndefined();
    });

    it('1.5倍は4096分率で丸める（威力75 → 112）', () => {
      // Arrange
      const pokemon = createStatus(StatusCondition.Paralysis);

      // Act
      const result = effect.modifyBasePower(pokemon, 75, createCtx('Physical'));

      // Assert
      expect(result).toBe(112);
    });

    it('やけどのとき、やけどの半減を打ち消す2倍と1.5倍を掛ける', () => {
      // Arrange
      const pokemon = createStatus(StatusCondition.Burn);

      // Act
      const result = effect.modifyBasePower(pokemon, 80, createCtx('Physical'));

      // Assert
      expect(result).toBe(240);
    });

    it('やけどでも、からげんきはやけどの半減を受けないので1.5倍だけにする', () => {
      // Arrange
      const pokemon = createStatus(StatusCondition.Burn);

      // Act
      const result = effect.modifyBasePower(pokemon, 140, createCtx('Physical', 'からげんき'));

      // Assert
      expect(result).toBe(210);
    });

    it('ボディプレスは攻撃を使わないので1.5倍にしない', () => {
      // Arrange
      const pokemon = createStatus(StatusCondition.Paralysis);

      // Act
      const result = effect.modifyBasePower(pokemon, 80, createCtx('Physical', 'ボディプレス'));

      // Assert
      expect(result).toBeUndefined();
    });

    it('やけどのボディプレスは、やけどの半減を打ち消す2倍だけを掛ける', () => {
      // Arrange
      const pokemon = createStatus(StatusCondition.Burn);

      // Act
      const result = effect.modifyBasePower(pokemon, 80, createCtx('Physical', 'ボディプレス'));

      // Assert
      expect(result).toBe(160);
    });

    it('状態異常がないときは威力を変えない', () => {
      // Arrange
      const pokemon = createStatus(null);

      // Act
      const result = effect.modifyBasePower(pokemon, 80, createCtx('Physical'));

      // Assert
      expect(result).toBeUndefined();
    });

    it.each([
      ['ひるみ', StatusCondition.Flinch],
      ['こんらん', StatusCondition.Confusion],
      ['None', StatusCondition.None],
    ])('%s は状態異常ではないので威力を変えない', (_label, status) => {
      // Arrange
      const pokemon = createStatus(status);

      // Act
      const result = effect.modifyBasePower(pokemon, 80, createCtx('Physical'));

      // Assert
      expect(result).toBeUndefined();
    });

    it('特殊技の威力は変えない', () => {
      // Arrange
      const pokemon = createStatus(StatusCondition.Burn);

      // Act
      const result = effect.modifyBasePower(pokemon, 80, createCtx('Special'));

      // Assert
      expect(result).toBeUndefined();
    });

    it('コンテキストがないときは威力を変えない', () => {
      // Arrange
      const pokemon = createStatus(StatusCondition.Paralysis);

      // Act
      const result = effect.modifyBasePower(pokemon, 80);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('ダメージ計算（DamageCalculator）', () => {
    const NORMAL = new Type(1, 'ノーマル', 'Normal');
    const stats = {
      attack: 120,
      defense: 100,
      specialAttack: 100,
      specialDefense: 100,
      speed: 100,
    };
    const createParams = (
      attacker: BattlePokemonStatus,
      power: number,
      attackerAbilityName?: string,
    ): DamageCalculationParams => ({
      attacker,
      defender: createStatus(null),
      move: { power, typeId: NORMAL.id, category: 'Physical', accuracy: 100 },
      moveType: NORMAL,
      attackerTypes: { primary: new Type(9, 'みず', 'Water'), secondary: null },
      defenderTypes: { primary: NORMAL, secondary: null },
      typeEffectiveness: new Map(),
      weather: null,
      field: null,
      attackerAbilityName,
      attackerStats: stats,
      defenderStats: stats,
      battle,
      battleContext: { battle, moveName: 'テスト技' },
    });

    beforeEach(() => {
      AbilityRegistry.clear();
      AbilityRegistry.initialize();
    });

    it('やけどでも半減せず、状態異常なしで威力1.5倍の技と同じダメージになる', async () => {
      // Arrange
      const expected = await DamageCalculator.calculate(createParams(createStatus(null), 120));

      // Act
      const damage = await DamageCalculator.calculate(
        createParams(createStatus(StatusCondition.Burn), 80, 'こんじょう'),
      );

      // Assert
      expect(damage).toBe(expected);
    });
  });
});
