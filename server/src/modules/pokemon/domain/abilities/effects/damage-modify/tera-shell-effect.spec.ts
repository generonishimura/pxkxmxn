import { TeraShellEffect } from './tera-shell-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../../battle-context.interface';
import { AbilityRegistry } from '../../ability-registry';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import {
  DamageCalculator,
  DamageCalculationParams,
} from '@/modules/battle/domain/logic/damage-calculator';

describe('TeraShellEffect（テラスシェル）', () => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);

  const createStatus = (currentHp: number, id = 1): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, id, true, currentHp, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (typeEffectiveness?: number, moveName = 'テスト技'): BattleContext => ({
    battle,
    moveName,
    moveCategory: 'Physical',
    typeEffectiveness,
  });

  let effect: TeraShellEffect;

  beforeEach(() => {
    effect = new TeraShellEffect();
  });

  describe('modifyDamage', () => {
    it('HPが満タンのとき、効果ばつぐんの技を効果いまひとつにする', () => {
      // Arrange
      const pokemon = createStatus(100);

      // Act
      const result = effect.modifyDamage(pokemon, 200, createCtx(2));

      // Assert
      expect(result).toBe(50);
    });

    it('HPが満タンのとき、等倍の技を効果いまひとつにする', () => {
      // Arrange
      const pokemon = createStatus(100);

      // Act
      const result = effect.modifyDamage(pokemon, 100, createCtx(1));

      // Assert
      expect(result).toBe(50);
    });

    it('HPが満タンのとき、1/4の技も効果いまひとつ（0.5倍）にする', () => {
      // Arrange
      const pokemon = createStatus(100);

      // Act
      const result = effect.modifyDamage(pokemon, 25, createCtx(0.25));

      // Assert
      expect(result).toBe(50);
    });

    it('HPが1でも減っていればダメージを変えない', () => {
      // Arrange
      const pokemon = createStatus(99);

      // Act
      const result = effect.modifyDamage(pokemon, 200, createCtx(2));

      // Assert
      expect(result).toBe(200);
    });

    it('効果がない技（相性0）はそのままにする', () => {
      // Arrange
      const pokemon = createStatus(100);

      // Act
      const result = effect.modifyDamage(pokemon, 0, createCtx(0));

      // Assert
      expect(result).toBe(0);
    });

    it('わるあがきには発動しない', () => {
      // Arrange
      const pokemon = createStatus(100);

      // Act
      const result = effect.modifyDamage(pokemon, 100, createCtx(1, 'わるあがき'));

      // Assert
      expect(result).toBe(100);
    });

    it('タイプ相性が分からないときはダメージを変えない', () => {
      // Arrange
      const pokemon = createStatus(100);

      // Act
      const result = effect.modifyDamage(pokemon, 100, createCtx(undefined));

      // Assert
      expect(result).toBe(100);
    });
  });

  describe('ダメージ計算（DamageCalculator）', () => {
    const NORMAL = new Type(1, 'ノーマル', 'Normal');
    const FIGHTING = new Type(3, 'かくとう', 'Fighting');
    const stats = {
      attack: 120,
      defense: 100,
      specialAttack: 100,
      specialDefense: 100,
      speed: 100,
    };
    const createParams = (
      defender: BattlePokemonStatus,
      typeEffectiveness: number,
      abilities: { attacker?: string; defender?: string } = {},
    ): DamageCalculationParams => ({
      attacker: createStatus(100, 1),
      defender,
      move: { power: 100, typeId: FIGHTING.id, category: 'Physical', accuracy: 100 },
      moveType: FIGHTING,
      attackerTypes: { primary: NORMAL, secondary: null },
      defenderTypes: { primary: NORMAL, secondary: null },
      typeEffectiveness: new Map([['3-1', typeEffectiveness]]),
      weather: null,
      field: null,
      attackerAbilityName: abilities.attacker,
      defenderAbilityName: abilities.defender,
      attackerStats: stats,
      defenderStats: stats,
      battle,
      battleContext: { battle, moveName: 'テスト技' },
    });

    beforeEach(() => {
      AbilityRegistry.clear();
      AbilityRegistry.initialize();
    });

    it('HPが満タンなら、効果ばつぐんの技が相性0.5倍のときと同じダメージになる', async () => {
      // Arrange
      const expected = await DamageCalculator.calculate(createParams(createStatus(100, 2), 0.5));

      // Act
      const damage = await DamageCalculator.calculate(
        createParams(createStatus(100, 2), 2, { defender: 'テラスシェル' }),
      );

      // Assert
      expect(damage).toBe(expected);
    });

    it('攻撃側がかたやぶりなら発動しない', async () => {
      // Arrange
      const expected = await DamageCalculator.calculate(
        createParams(createStatus(100, 2), 2, { attacker: 'かたやぶり' }),
      );

      // Act
      const damage = await DamageCalculator.calculate(
        createParams(createStatus(100, 2), 2, { attacker: 'かたやぶり', defender: 'テラスシェル' }),
      );

      // Assert
      expect(damage).toBe(expected);
    });
  });
});
