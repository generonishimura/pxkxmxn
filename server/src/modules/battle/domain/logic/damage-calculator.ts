import { Type } from '../../../pokemon/domain/entities/type.entity';
import { AbilityRegistry } from '../../../pokemon/domain/abilities/ability-registry';
import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { Weather, Field } from '../entities/battle.entity';

/**
 * Moveの情報
 */
export interface MoveInfo {
  power: number | null; // 変化技の場合はnull
  typeId: number; // 技のタイプID
  category: 'Physical' | 'Special' | 'Status'; // 物理、特殊、変化
  accuracy: number | null; // 必中技の場合はnull
}

/**
 * ダメージ計算の入力パラメータ
 */
export interface DamageCalculationParams {
  attacker: BattlePokemonStatus;
  defender: BattlePokemonStatus;
  move: MoveInfo;
  attackerTypes: { primary: Type; secondary: Type | null }; // 攻撃側のポケモンのタイプ
  defenderTypes: { primary: Type; secondary: Type | null }; // 防御側のポケモンのタイプ
  typeEffectiveness: Map<string, number>; // タイプ相性マップ (key: "typeFromId-typeToId", value: effectiveness)
  weather: Weather | null;
  field: Field | null;
  attackerAbilityName?: string; // 攻撃側の特性名
  defenderAbilityName?: string; // 防御側の特性名
}

/**
 * DamageCalculator
 * ポケモンのダメージ計算ロジック
 *
 * 基本ダメージ計算式:
 * ダメージ = floor((floor((2 * level / 5 + 2) * power * A / D) / 50) + 2) * その他の補正
 *
 * 考慮する要素:
 * - タイプ相性
 * - タイプ一致（技のタイプとポケモンのタイプが一致）
 * - ランク補正（BattlePokemonStatusのgetStatMultiplierを使用）
 * - 特性効果（AbilityRegistryを使用）
 * - 天候
 * - フィールド
 */
export class DamageCalculator {
  /**
   * ダメージを計算
   * @param params ダメージ計算の入力パラメータ
   * @returns ダメージ値（変化技の場合は0）
   */
  static calculate(params: DamageCalculationParams): number {
    // 変化技の場合はダメージ0
    if (params.move.category === 'Status' || params.move.power === null) {
      return 0;
    }

    const move = params.move;
    const attacker = params.attacker;
    const defender = params.defender;

    // レベルは50を想定（バトルで使用される標準レベル）
    const level = 50;

    // 攻撃側のステータス（物理/特殊で分岐）
    const attackStat = move.category === 'Physical'
      ? this.getEffectiveStat(attacker, 'attack')
      : this.getEffectiveStat(attacker, 'specialAttack');

    // 防御側のステータス（物理/特殊で分岐）
    const defenseStat = move.category === 'Physical'
      ? this.getEffectiveStat(defender, 'defense')
      : this.getEffectiveStat(defender, 'specialDefense');

    // 基本ダメージ計算: floor((floor((2 * level / 5 + 2) * power * A / D) / 50) + 2)
    const baseDamage = Math.floor(
      (Math.floor((2 * level / 5 + 2) * move.power * attackStat / defenseStat) / 50) + 2
    );

    // タイプ一致補正（1.5倍または1.0倍）
    const stab = this.calculateStab(params.move.typeId, params.attackerTypes);

    // タイプ相性補正
    const typeEffectiveness = this.calculateTypeEffectiveness(
      params.move.typeId,
      params.defenderTypes,
      params.typeEffectiveness,
    );

    // ダメージ修正（特性、天候、フィールドなど）
    let damageMultiplier = stab * typeEffectiveness;

    // 攻撃側の特性効果によるダメージ修正
    if (params.attackerAbilityName) {
      const abilityEffect = AbilityRegistry.get(params.attackerAbilityName);
      if (abilityEffect?.modifyDamageDealt) {
        const modifiedDamage = abilityEffect.modifyDamageDealt(
          attacker,
          baseDamage * damageMultiplier,
          {
            weather: params.weather,
            field: params.field,
          },
        );
        if (modifiedDamage !== undefined) {
          damageMultiplier = modifiedDamage / baseDamage;
        }
      }
    }

    // 防御側の特性効果によるダメージ修正
    if (params.defenderAbilityName) {
      const abilityEffect = AbilityRegistry.get(params.defenderAbilityName);
      if (abilityEffect?.modifyDamage) {
        const modifiedDamage = abilityEffect.modifyDamage(
          defender,
          baseDamage * damageMultiplier,
          {
            weather: params.weather,
            field: params.field,
          },
        );
        if (modifiedDamage !== undefined) {
          damageMultiplier = modifiedDamage / baseDamage;
        }
      }
    }

    // 天候による補正
    damageMultiplier *= this.getWeatherMultiplier(params.move.typeId, params.weather);

    // 最終ダメージを計算
    const finalDamage = Math.floor(baseDamage * damageMultiplier);

    // 最低ダメージは1
    return Math.max(1, finalDamage);
  }

  /**
   * ランク補正を考慮した実効ステータスを取得
   */
  private static getEffectiveStat(
    status: BattlePokemonStatus,
    statType: 'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed',
  ): number {
    // 最大HPを基準に実効ステータスを計算
    // 実際の実装では、元のステータス値が必要だが、ここでは最大HPを基準値として使用
    // 実際の実装では、TrainedPokemonから計算されたステータス値を使用する必要がある
    const baseStat = status.maxHp; // 仮の値。実際にはStatCalculatorで計算した値を使用
    const multiplier = status.getStatMultiplier(statType);
    return Math.floor(baseStat * multiplier);
  }

  /**
   * タイプ一致（STAB: Same Type Attack Bonus）を計算
   * 技のタイプとポケモンのタイプが一致する場合、1.5倍
   */
  private static calculateStab(
    moveTypeId: number,
    attackerTypes: { primary: Type; secondary: Type | null },
  ): number {
    if (attackerTypes.primary.id === moveTypeId) {
      return 1.5;
    }
    if (attackerTypes.secondary?.id === moveTypeId) {
      return 1.5;
    }
    return 1.0;
  }

  /**
   * タイプ相性を計算
   * 複数のタイプがある場合、相性は掛け算される
   */
  private static calculateTypeEffectiveness(
    moveTypeId: number,
    defenderTypes: { primary: Type; secondary: Type | null },
    typeEffectiveness: Map<string, number>,
  ): number {
    let effectiveness = 1.0;

    // メインタイプとの相性
    const primaryKey = `${moveTypeId}-${defenderTypes.primary.id}`;
    const primaryEffectiveness = typeEffectiveness.get(primaryKey);
    if (primaryEffectiveness !== undefined) {
      effectiveness *= primaryEffectiveness;
    }

    // サブタイプがある場合の相性
    if (defenderTypes.secondary) {
      const secondaryKey = `${moveTypeId}-${defenderTypes.secondary.id}`;
      const secondaryEffectiveness = typeEffectiveness.get(secondaryKey);
      if (secondaryEffectiveness !== undefined) {
        effectiveness *= secondaryEffectiveness;
      }
    }

    return effectiveness;
  }

  /**
   * 天候による補正を取得
   */
  private static getWeatherMultiplier(
    moveTypeId: number,
    weather: Weather | null,
  ): number {
    if (!weather) {
      return 1.0;
    }

    // 天候による補正（簡易実装）
    // 実際の実装では、タイプIDを確認して適切な補正を適用する必要がある
    // 例: 晴れの時、ほのおタイプの技は1.5倍、みずタイプの技は0.5倍
    // 例: 雨の時、みずタイプの技は1.5倍、ほのおタイプの技は0.5倍

    // ここでは簡易実装として1.0を返す
    // 実際の実装では、Typeエンティティを使用してタイプを判定する必要がある
    return 1.0;
  }
}

