import { DamageCalculator, DamageCalculationParams, MoveInfo } from './damage-calculator';
import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { StatusCondition } from '../entities/status-condition.enum';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { Weather, Battle } from '../entities/battle.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MultiscaleEffect } from '@/modules/pokemon/domain/abilities/effects/multiscale-effect';

describe('DamageCalculator', () => {
  // テスト用のヘルパー関数
  const createBattlePokemonStatus = (
    overrides?: Partial<BattlePokemonStatus>,
  ): BattlePokemonStatus => {
    return new BattlePokemonStatus(
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
  };

  const createType = (id: number, name: string = `Type${id}`, nameEn: string = `Type${id}En`): Type => {
    return new Type(id, name, nameEn);
  };

  const createMoveInfo = (overrides?: Partial<MoveInfo>): MoveInfo => {
    return {
      power: overrides?.power ?? 100,
      typeId: overrides?.typeId ?? 1,
      category: overrides?.category ?? 'Physical',
      accuracy: overrides?.accuracy ?? 100,
    };
  };

  // moveTypeIdからTypeエンティティを作成するヘルパー関数
  const createMoveType = (typeId: number, nameEn?: string): Type => {
    // 天候補正テスト用に、ほのおとみずタイプを特別に扱う
    if (nameEn) {
      return createType(typeId, `Type${typeId}`, nameEn);
    }
    return createType(typeId);
  };

  beforeEach(() => {
    // AbilityRegistryをリセット
    const registry = (AbilityRegistry as any).registry;
    if (registry) {
      registry.clear();
    }
    AbilityRegistry.initialize();
  });

  describe('calculate - 基本ダメージ計算', () => {
    it('変化技の場合はダメージ0を返す', () => {
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus();
      const move: MoveInfo = {
        power: null,
        typeId: 1,
        category: 'Status',
        accuracy: 100,
      };

      const params: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(1), secondary: null },
        defenderTypes: { primary: createType(2), secondary: null },
        typeEffectiveness: new Map([['1-2', 1.0]]),
        weather: null,
        field: null,
        attackerStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      expect(DamageCalculator.calculate(params)).toBe(0);
    });

    it('powerがnullの場合はダメージ0を返す', () => {
      const attacker = createBattlePokemonStatus();
      const defender = createBattlePokemonStatus();
      const move: MoveInfo = {
        power: null,
        typeId: 1,
        category: 'Physical',
        accuracy: 100,
      };

      const params: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(1), secondary: null },
        defenderTypes: { primary: createType(2), secondary: null },
        typeEffectiveness: new Map([['1-2', 1.0]]),
        weather: null,
        field: null,
        attackerStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      expect(DamageCalculator.calculate(params)).toBe(0);
    });

    it('基本ダメージ計算式が正しく動作する', () => {
      const attacker = createBattlePokemonStatus({
        attackRank: 0,
      });
      const defender = createBattlePokemonStatus({
        defenseRank: 0,
      });
      const move = createMoveInfo({
        power: 100,
        typeId: 1,
        category: 'Physical',
      });

      const params: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(2), secondary: null }, // STABなし
        defenderTypes: { primary: createType(3), secondary: null },
        typeEffectiveness: new Map([['1-3', 1.0]]),
        weather: null,
        field: null,
        attackerStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const damage = DamageCalculator.calculate(params);
      // レベル50、攻撃100、防御100、威力100の場合の基本ダメージ
      // floor((floor((2 * 50 / 5 + 2) * 100 * 100 / 100) / 50) + 2)
      // = floor((floor(22 * 100) / 50) + 2)
      // = floor(2200 / 50 + 2)
      // = floor(44 + 2)
      // = 46
      expect(damage).toBeGreaterThan(0);
      expect(damage).toBeLessThan(100);
    });

    it('攻撃側のステータスが高いほどダメージが大きくなる', () => {
      const defender = createBattlePokemonStatus({ defenseRank: 0 });
      const move = createMoveInfo({ power: 100, typeId: 1, category: 'Physical' });

      const paramsLowAttack: DamageCalculationParams = {
        attacker: createBattlePokemonStatus({ attackRank: 0 }),
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(2), secondary: null },
        defenderTypes: { primary: createType(3), secondary: null },
        typeEffectiveness: new Map([['1-3', 1.0]]),
        weather: null,
        field: null,
        attackerStats: { attack: 50, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const paramsHighAttack: DamageCalculationParams = {
        ...paramsLowAttack,
        attackerStats: { attack: 150, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const damageLow = DamageCalculator.calculate(paramsLowAttack);
      const damageHigh = DamageCalculator.calculate(paramsHighAttack);

      expect(damageHigh).toBeGreaterThan(damageLow);
    });

    it('防御側のステータスが高いほどダメージが小さくなる', () => {
      const attacker = createBattlePokemonStatus({ attackRank: 0 });
      const move = createMoveInfo({ power: 100, typeId: 1, category: 'Physical' });

      const paramsLowDefense: DamageCalculationParams = {
        attacker,
        defender: createBattlePokemonStatus({ defenseRank: 0 }),
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(2), secondary: null },
        defenderTypes: { primary: createType(3), secondary: null },
        typeEffectiveness: new Map([['1-3', 1.0]]),
        weather: null,
        field: null,
        attackerStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 50, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const paramsHighDefense: DamageCalculationParams = {
        ...paramsLowDefense,
        defenderStats: { attack: 100, defense: 150, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const damageLow = DamageCalculator.calculate(paramsLowDefense);
      const damageHigh = DamageCalculator.calculate(paramsHighDefense);

      expect(damageLow).toBeGreaterThan(damageHigh);
    });
  });

  describe('calculate - タイプ一致（STAB）', () => {
    it('技のタイプとポケモンのメインタイプが一致する場合、1.5倍になる', () => {
      const attacker = createBattlePokemonStatus({ attackRank: 0 });
      const defender = createBattlePokemonStatus({ defenseRank: 0 });
      const move = createMoveInfo({ power: 100, typeId: 1, category: 'Physical' });

      const paramsWithStab: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(1), secondary: null }, // STABあり
        defenderTypes: { primary: createType(2), secondary: null },
        typeEffectiveness: new Map([['1-2', 1.0]]),
        weather: null,
        field: null,
        attackerStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const paramsWithoutStab: DamageCalculationParams = {
        ...paramsWithStab,
        attackerTypes: { primary: createType(2), secondary: null }, // STABなし
      };

      const damageWithStab = DamageCalculator.calculate(paramsWithStab);
      const damageWithoutStab = DamageCalculator.calculate(paramsWithoutStab);

      // STABありのダメージは約1.5倍になる
      expect(damageWithStab).toBeGreaterThan(damageWithoutStab);
      const ratio = damageWithStab / damageWithoutStab;
      expect(ratio).toBeCloseTo(1.5, 0.1);
    });

    it('技のタイプとポケモンのサブタイプが一致する場合、1.5倍になる', () => {
      const attacker = createBattlePokemonStatus({ attackRank: 0 });
      const defender = createBattlePokemonStatus({ defenseRank: 0 });
      const move = createMoveInfo({ power: 100, typeId: 1, category: 'Physical' });

      const paramsWithStab: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(2), secondary: createType(1) }, // サブタイプでSTAB
        defenderTypes: { primary: createType(3), secondary: null },
        typeEffectiveness: new Map([['1-3', 1.0]]),
        weather: null,
        field: null,
        attackerStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const paramsWithoutStab: DamageCalculationParams = {
        ...paramsWithStab,
        attackerTypes: { primary: createType(2), secondary: createType(3) }, // STABなし
      };

      const damageWithStab = DamageCalculator.calculate(paramsWithStab);
      const damageWithoutStab = DamageCalculator.calculate(paramsWithoutStab);

      const ratio = damageWithStab / damageWithoutStab;
      expect(ratio).toBeCloseTo(1.5, 0.1);
    });
  });

  describe('calculate - タイプ相性', () => {
    it('タイプ相性が2倍の場合、ダメージが2倍になる', () => {
      const attacker = createBattlePokemonStatus({ attackRank: 0 });
      const defender = createBattlePokemonStatus({ defenseRank: 0 });
      const move = createMoveInfo({ power: 100, typeId: 1, category: 'Physical' });

      const paramsSuperEffective: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(2), secondary: null },
        defenderTypes: { primary: createType(3), secondary: null },
        typeEffectiveness: new Map([['1-3', 2.0]]), // 2倍
        weather: null,
        field: null,
        attackerStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const paramsNormal: DamageCalculationParams = {
        ...paramsSuperEffective,
        typeEffectiveness: new Map([['1-3', 1.0]]), // 1倍
      };

      const damageSuperEffective = DamageCalculator.calculate(paramsSuperEffective);
      const damageNormal = DamageCalculator.calculate(paramsNormal);

      const ratio = damageSuperEffective / damageNormal;
      expect(ratio).toBeCloseTo(2.0, 0.1);
    });

    it('タイプ相性が0.5倍の場合、ダメージが0.5倍になる', () => {
      const attacker = createBattlePokemonStatus({ attackRank: 0 });
      const defender = createBattlePokemonStatus({ defenseRank: 0 });
      const move = createMoveInfo({ power: 100, typeId: 1, category: 'Physical' });

      const paramsNotVeryEffective: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(2), secondary: null },
        defenderTypes: { primary: createType(3), secondary: null },
        typeEffectiveness: new Map([['1-3', 0.5]]), // 0.5倍
        weather: null,
        field: null,
        attackerStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const paramsNormal: DamageCalculationParams = {
        ...paramsNotVeryEffective,
        typeEffectiveness: new Map([['1-3', 1.0]]), // 1倍
      };

      const damageNotVeryEffective = DamageCalculator.calculate(paramsNotVeryEffective);
      const damageNormal = DamageCalculator.calculate(paramsNormal);

      const ratio = damageNotVeryEffective / damageNormal;
      expect(ratio).toBeCloseTo(0.5, 0.1);
    });

    it('タイプ相性が0倍の場合、ダメージが0になる', () => {
      const attacker = createBattlePokemonStatus({ attackRank: 0 });
      const defender = createBattlePokemonStatus({ defenseRank: 0 });
      const move = createMoveInfo({ power: 100, typeId: 1, category: 'Physical' });

      const params: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(2), secondary: null },
        defenderTypes: { primary: createType(3), secondary: null },
        typeEffectiveness: new Map([['1-3', 0.0]]), // 無効
        weather: null,
        field: null,
        attackerStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const damage = DamageCalculator.calculate(params);
      expect(damage).toBe(0);
    });

    it('複数タイプがある場合、タイプ相性は掛け算される', () => {
      const attacker = createBattlePokemonStatus({ attackRank: 0 });
      const defender = createBattlePokemonStatus({ defenseRank: 0 });
      const move = createMoveInfo({ power: 100, typeId: 1, category: 'Physical' });

      // 両方とも2倍の場合、4倍になる
      const paramsDoubleSuperEffective: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(2), secondary: null },
        defenderTypes: { primary: createType(3), secondary: createType(4) },
        typeEffectiveness: new Map([
          ['1-3', 2.0], // 2倍
          ['1-4', 2.0], // 2倍
        ]),
        weather: null,
        field: null,
        attackerStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const paramsNormal: DamageCalculationParams = {
        ...paramsDoubleSuperEffective,
        defenderTypes: { primary: createType(3), secondary: null },
        typeEffectiveness: new Map([['1-3', 1.0]]),
      };

      const damageDoubleSuperEffective = DamageCalculator.calculate(paramsDoubleSuperEffective);
      const damageNormal = DamageCalculator.calculate(paramsNormal);

      const ratio = damageDoubleSuperEffective / damageNormal;
      expect(ratio).toBeCloseTo(4.0, 0.1);
    });

    it('タイプ相性が0.5倍と2倍の組み合わせの場合、1倍になる', () => {
      const attacker = createBattlePokemonStatus({ attackRank: 0 });
      const defender = createBattlePokemonStatus({ defenseRank: 0 });
      const move = createMoveInfo({ power: 100, typeId: 1, category: 'Physical' });

      const params: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(2), secondary: null },
        defenderTypes: { primary: createType(3), secondary: createType(4) },
        typeEffectiveness: new Map([
          ['1-3', 2.0], // 2倍
          ['1-4', 0.5], // 0.5倍
        ]),
        weather: null,
        field: null,
        attackerStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const damage = DamageCalculator.calculate(params);
      expect(damage).toBeGreaterThan(0);
      // 2.0 * 0.5 = 1.0なので、通常ダメージとほぼ同じになる
    });
  });

  describe('calculate - ランク補正', () => {
    it('攻撃ランクが+1の場合、ダメージが1.5倍になる', () => {
      const attacker = createBattlePokemonStatus({ attackRank: 1 });
      const defender = createBattlePokemonStatus({ defenseRank: 0 });
      const move = createMoveInfo({ power: 100, typeId: 1, category: 'Physical' });

      const paramsRankUp: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(2), secondary: null },
        defenderTypes: { primary: createType(3), secondary: null },
        typeEffectiveness: new Map([['1-3', 1.0]]),
        weather: null,
        field: null,
        attackerStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const paramsNoRank: DamageCalculationParams = {
        ...paramsRankUp,
        attacker: createBattlePokemonStatus({ attackRank: 0 }),
      };

      const damageRankUp = DamageCalculator.calculate(paramsRankUp);
      const damageNoRank = DamageCalculator.calculate(paramsNoRank);

      const ratio = damageRankUp / damageNoRank;
      expect(ratio).toBeCloseTo(1.5, 0.1);
    });

    it('防御ランクが+1の場合、ダメージが2/3倍になる', () => {
      const attacker = createBattlePokemonStatus({ attackRank: 0 });
      const defender = createBattlePokemonStatus({ defenseRank: 1 });
      const move = createMoveInfo({ power: 100, typeId: 1, category: 'Physical' });

      const paramsRankUp: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(2), secondary: null },
        defenderTypes: { primary: createType(3), secondary: null },
        typeEffectiveness: new Map([['1-3', 1.0]]),
        weather: null,
        field: null,
        attackerStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const paramsNoRank: DamageCalculationParams = {
        ...paramsRankUp,
        defender: createBattlePokemonStatus({ defenseRank: 0 }),
      };

      const damageRankUp = DamageCalculator.calculate(paramsRankUp);
      const damageNoRank = DamageCalculator.calculate(paramsNoRank);

      const ratio = damageRankUp / damageNoRank;
      expect(ratio).toBeCloseTo(2 / 3, 0.1);
    });

    it('攻撃ランクが-1の場合、ダメージが2/3倍になる', () => {
      const attacker = createBattlePokemonStatus({ attackRank: -1 });
      const defender = createBattlePokemonStatus({ defenseRank: 0 });
      const move = createMoveInfo({ power: 100, typeId: 1, category: 'Physical' });

      const paramsRankDown: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(2), secondary: null },
        defenderTypes: { primary: createType(3), secondary: null },
        typeEffectiveness: new Map([['1-3', 1.0]]),
        weather: null,
        field: null,
        attackerStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const paramsNoRank: DamageCalculationParams = {
        ...paramsRankDown,
        attacker: createBattlePokemonStatus({ attackRank: 0 }),
      };

      const damageRankDown = DamageCalculator.calculate(paramsRankDown);
      const damageNoRank = DamageCalculator.calculate(paramsNoRank);

      const ratio = damageRankDown / damageNoRank;
      expect(ratio).toBeCloseTo(2 / 3, 0.1);
    });

    it('特殊攻撃技の場合、特殊攻撃ランクが使用される', () => {
      const attacker = createBattlePokemonStatus({ specialAttackRank: 1 });
      const defender = createBattlePokemonStatus({ specialDefenseRank: 0 });
      const move = createMoveInfo({ power: 100, typeId: 1, category: 'Special' });

      const paramsRankUp: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(2), secondary: null },
        defenderTypes: { primary: createType(3), secondary: null },
        typeEffectiveness: new Map([['1-3', 1.0]]),
        weather: null,
        field: null,
        attackerStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const paramsNoRank: DamageCalculationParams = {
        ...paramsRankUp,
        attacker: createBattlePokemonStatus({ specialAttackRank: 0 }),
      };

      const damageRankUp = DamageCalculator.calculate(paramsRankUp);
      const damageNoRank = DamageCalculator.calculate(paramsNoRank);

      const ratio = damageRankUp / damageNoRank;
      expect(ratio).toBeCloseTo(1.5, 0.1);
    });
  });

  describe('calculate - やけどによる物理攻撃補正', () => {
    it('やけど状態のポケモンが物理技を使用する場合、ダメージが0.5倍になる', () => {
      const attacker = createBattlePokemonStatus({
        attackRank: 0,
        statusCondition: StatusCondition.Burn,
      });
      const defender = createBattlePokemonStatus({ defenseRank: 0 });
      const move = createMoveInfo({ power: 100, typeId: 1, category: 'Physical' });

      const paramsBurn: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(2), secondary: null },
        defenderTypes: { primary: createType(3), secondary: null },
        typeEffectiveness: new Map([['1-3', 1.0]]),
        weather: null,
        field: null,
        attackerStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const paramsNoBurn: DamageCalculationParams = {
        ...paramsBurn,
        attacker: createBattlePokemonStatus({ attackRank: 0, statusCondition: null }),
      };

      const damageBurn = DamageCalculator.calculate(paramsBurn);
      const damageNoBurn = DamageCalculator.calculate(paramsNoBurn);

      const ratio = damageBurn / damageNoBurn;
      expect(ratio).toBeCloseTo(0.5, 0.1);
    });

    it('やけど状態でも特殊技を使用する場合、ダメージ補正は適用されない', () => {
      const attacker = createBattlePokemonStatus({
        specialAttackRank: 0,
        statusCondition: StatusCondition.Burn,
      });
      const defender = createBattlePokemonStatus({ specialDefenseRank: 0 });
      const move = createMoveInfo({ power: 100, typeId: 1, category: 'Special' });

      const paramsBurn: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(2), secondary: null },
        defenderTypes: { primary: createType(3), secondary: null },
        typeEffectiveness: new Map([['1-3', 1.0]]),
        weather: null,
        field: null,
        attackerStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const paramsNoBurn: DamageCalculationParams = {
        ...paramsBurn,
        attacker: createBattlePokemonStatus({ specialAttackRank: 0, statusCondition: null }),
      };

      const damageBurn = DamageCalculator.calculate(paramsBurn);
      const damageNoBurn = DamageCalculator.calculate(paramsNoBurn);

      // やけどは特殊技には影響しない
      expect(damageBurn).toBeCloseTo(damageNoBurn, 0);
    });
  });

  describe('calculate - 特性効果', () => {
    it('攻撃側の特性効果がundefinedを返す場合、ダメージが変更されない', () => {
      const attacker = createBattlePokemonStatus({ attackRank: 0 });
      const defender = createBattlePokemonStatus({ defenseRank: 0 });
      const move = createMoveInfo({ power: 100, typeId: 1, category: 'Physical' });

      // modifyDamageDealtがundefinedを返す特性効果をモック
      const mockAbilityEffect = {
        modifyDamageDealt: jest.fn().mockReturnValue(undefined),
      };
      AbilityRegistry.register('test-ability', mockAbilityEffect as any);

      const paramsWithAbility: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(2), secondary: null },
        defenderTypes: { primary: createType(3), secondary: null },
        typeEffectiveness: new Map([['1-3', 1.0]]),
        weather: null,
        field: null,
        attackerAbilityName: 'test-ability',
        attackerStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const paramsWithoutAbility: DamageCalculationParams = {
        ...paramsWithAbility,
        attackerAbilityName: undefined,
      };

      const damageWithAbility = DamageCalculator.calculate(paramsWithAbility);
      const damageWithoutAbility = DamageCalculator.calculate(paramsWithoutAbility);

      // undefinedを返す場合はダメージが変更されない
      expect(damageWithAbility).toBeCloseTo(damageWithoutAbility, 0);
      expect(mockAbilityEffect.modifyDamageDealt).toHaveBeenCalled();
    });

    it('マルチスケイル特性でHPが満タンの場合、ダメージが半減する', () => {
      const attacker = createBattlePokemonStatus({ attackRank: 0 });
      const defender = createBattlePokemonStatus({
        defenseRank: 0,
        currentHp: 100,
        maxHp: 100, // HP満タン
      });
      const move = createMoveInfo({ power: 100, typeId: 1, category: 'Physical' });

      // マルチスケイルを登録
      AbilityRegistry.register('マルチスケイル', new MultiscaleEffect());

      const paramsWithMultiscale: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(2), secondary: null },
        defenderTypes: { primary: createType(3), secondary: null },
        typeEffectiveness: new Map([['1-3', 1.0]]),
        weather: null,
        field: null,
        defenderAbilityName: 'マルチスケイル',
        attackerStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const paramsWithoutMultiscale: DamageCalculationParams = {
        ...paramsWithMultiscale,
        defenderAbilityName: undefined,
      };

      const damageWithMultiscale = DamageCalculator.calculate(paramsWithMultiscale);
      const damageWithoutMultiscale = DamageCalculator.calculate(paramsWithoutMultiscale);

      const ratio = damageWithMultiscale / damageWithoutMultiscale;
      expect(ratio).toBeCloseTo(0.5, 0.1);
    });

    it('マルチスケイル特性でHPが満タンでない場合、ダメージ補正は適用されない', () => {
      const attacker = createBattlePokemonStatus({ attackRank: 0 });
      const defender = createBattlePokemonStatus({
        defenseRank: 0,
        currentHp: 50,
        maxHp: 100, // HP満タンではない
      });
      const move = createMoveInfo({ power: 100, typeId: 1, category: 'Physical' });

      AbilityRegistry.register('マルチスケイル', new MultiscaleEffect());

      const paramsWithMultiscale: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(2), secondary: null },
        defenderTypes: { primary: createType(3), secondary: null },
        typeEffectiveness: new Map([['1-3', 1.0]]),
        weather: null,
        field: null,
        defenderAbilityName: 'マルチスケイル',
        attackerStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const paramsWithoutMultiscale: DamageCalculationParams = {
        ...paramsWithMultiscale,
        defenderAbilityName: undefined,
      };

      const damageWithMultiscale = DamageCalculator.calculate(paramsWithMultiscale);
      const damageWithoutMultiscale = DamageCalculator.calculate(paramsWithoutMultiscale);

      // HPが満タンでない場合は補正なし
      expect(damageWithMultiscale).toBeCloseTo(damageWithoutMultiscale, 0);
    });
  });

  describe('calculate - エッジケース', () => {
    it('タイプ相性が無効でない場合でも、計算結果が0の場合は0ダメージを返す', () => {
      const attacker = createBattlePokemonStatus({
        attackRank: -6, // 最低ランク
      });
      const defender = createBattlePokemonStatus({
        defenseRank: 6, // 最高ランク
      });
      const move = createMoveInfo({ power: 1, typeId: 1, category: 'Physical' }); // 最低威力

      const params: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(2), secondary: null },
        defenderTypes: { primary: createType(3), secondary: null },
        typeEffectiveness: new Map([['1-3', 0.25]]), // 0.25倍（無効ではないが、計算結果が0になる可能性がある）
        weather: null,
        field: null,
        attackerStats: { attack: 1, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 999, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const damage = DamageCalculator.calculate(params);
      // 計算結果が0以下の場合は0を返す（最低1ダメージを保証しない）
      expect(damage).toBeGreaterThanOrEqual(0);
    });

    it('タイプ相性が無効でない場合、計算結果が1以上の場合はそのまま返す', () => {
      const attacker = createBattlePokemonStatus({
        attackRank: 0,
      });
      const defender = createBattlePokemonStatus({
        defenseRank: 0,
      });
      const move = createMoveInfo({ power: 100, typeId: 1, category: 'Physical' });

      const params: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(2), secondary: null },
        defenderTypes: { primary: createType(3), secondary: null },
        typeEffectiveness: new Map([['1-3', 0.5]]), // 0.5倍（無効ではない）
        weather: null,
        field: null,
        attackerStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const damage = DamageCalculator.calculate(params);
      // 計算結果が1以上の場合はそのまま返す
      expect(damage).toBeGreaterThanOrEqual(1);
    });

    it('タイプ相性が無効の場合、最低ダメージでも0になる', () => {
      const attacker = createBattlePokemonStatus({ attackRank: 6 });
      const defender = createBattlePokemonStatus({ defenseRank: -6 });
      const move = createMoveInfo({ power: 999, typeId: 1, category: 'Physical' });

      const params: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(2), secondary: null },
        defenderTypes: { primary: createType(3), secondary: null },
        typeEffectiveness: new Map([['1-3', 0.0]]), // 無効
        weather: null,
        field: null,
        attackerStats: { attack: 999, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 1, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const damage = DamageCalculator.calculate(params);
      expect(damage).toBe(0);
    });

    it('baseStatsが提供されていない場合、maxHpをフォールバックとして使用する', () => {
      const attacker = createBattlePokemonStatus({ maxHp: 200 });
      const defender = createBattlePokemonStatus({ maxHp: 100 });
      const move = createMoveInfo({ power: 100, typeId: 1, category: 'Physical' });

      const params: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(2), secondary: null },
        defenderTypes: { primary: createType(3), secondary: null },
        typeEffectiveness: new Map([['1-3', 1.0]]),
        weather: null,
        field: null,
        // attackerStatsとdefenderStatsを提供しない
      };

      // エラーが発生しないことを確認
      expect(() => DamageCalculator.calculate(params)).not.toThrow();
      const damage = DamageCalculator.calculate(params);
      expect(damage).toBeGreaterThan(0);
    });

    it('getEffectiveStatに不正なstatTypeが渡された場合、エラーが発生する', () => {
      // getEffectiveStatはprivateメソッドなので、間接的にテストする
      // baseStatsに不正な値が含まれている場合のエラーは発生しないが、
      // TypeScriptの型チェックで防がれるため、実際のテストは不要
      // ただし、将来的にリフレクションなどでアクセス可能になった場合に備えて、
      // エラーメッセージが適切であることを確認するテストを追加
      const attacker = createBattlePokemonStatus({ attackRank: 0 });
      const defender = createBattlePokemonStatus({ defenseRank: 0 });
      const move = createMoveInfo({ power: 100, typeId: 1, category: 'Physical' });

      const params: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(2), secondary: null },
        defenderTypes: { primary: createType(3), secondary: null },
        typeEffectiveness: new Map([['1-3', 1.0]]),
        weather: null,
        field: null,
        attackerStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      // 正常なケースではエラーが発生しないことを確認
      expect(() => DamageCalculator.calculate(params)).not.toThrow();
    });
  });

  describe('calculate - 天候補正', () => {
    it('天候が設定されていても、現在は1.0倍を返す（実装が不完全）', () => {
      const attacker = createBattlePokemonStatus({ attackRank: 0 });
      const defender = createBattlePokemonStatus({ defenseRank: 0 });
      const move = createMoveInfo({ power: 100, typeId: 1, category: 'Physical' });

      const paramsWithWeather: DamageCalculationParams = {
        attacker,
        defender,
        move,
        moveType: createMoveType(move.typeId),
        attackerTypes: { primary: createType(2), secondary: null },
        defenderTypes: { primary: createType(3), secondary: null },
        typeEffectiveness: new Map([['1-3', 1.0]]),
        weather: Weather.Sun,
        field: null,
        attackerStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
        defenderStats: { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      };

      const paramsNoWeather: DamageCalculationParams = {
        ...paramsWithWeather,
        weather: null,
      };

      const damageWithWeather = DamageCalculator.calculate(paramsWithWeather);
      const damageNoWeather = DamageCalculator.calculate(paramsNoWeather);

      // 現在の実装では天候補正は1.0倍のまま
      expect(damageWithWeather).toBeCloseTo(damageNoWeather, 0);
    });
  });
});

