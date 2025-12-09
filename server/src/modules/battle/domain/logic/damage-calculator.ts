import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { Weather, Field, Battle } from '../entities/battle.entity';
import { StatusConditionHandler } from './status-condition-handler';
import { ValidationException } from '@/shared/domain/exceptions';

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
  moveType: Type; // 技のタイプ（天候補正などで使用）
  attackerTypes: { primary: Type; secondary: Type | null }; // 攻撃側のポケモンのタイプ
  defenderTypes: { primary: Type; secondary: Type | null }; // 防御側のポケモンのタイプ
  typeEffectiveness: Map<string, number>; // タイプ相性マップ (key: "typeFromId-typeToId", value: effectiveness)
  weather: Weather | null;
  field: Field | null;
  attackerAbilityName?: string; // 攻撃側の特性名
  defenderAbilityName?: string; // 防御側の特性名
  attackerStats?: {
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  }; // 攻撃側の実際のステータス値（ランク補正前）
  defenderStats?: {
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  }; // 防御側の実際のステータス値（ランク補正前）
  battle?: Battle; // バトルエンティティ（特性効果で使用）
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
   * バトルで使用される標準レベル
   * ポケモンの公式バトルではレベル50が標準として使用される
   * 参照: REQUIREMENT.md セクション「標準レベル」
   */
  private static readonly STANDARD_BATTLE_LEVEL = 50;

  /**
   * ダメージ計算式のレベル倍率（2 * level / 5 + 2 の部分の2）
   * 基本ダメージ計算式のレベル項の係数
   */
  private static readonly LEVEL_MULTIPLIER = 2;

  /**
   * ダメージ計算式のレベル除数（level / 5 の部分の5）
   * レベルを5で割ることで、レベルによる影響を調整
   */
  private static readonly LEVEL_DIVISOR = 5;

  /**
   * ダメージ計算式の攻撃・防御除数（/ 50 の部分の50）
   * 攻撃力と防御力の比を50で割ることで、ダメージのスケールを調整
   */
  private static readonly ATTACK_DEFENSE_DIVISOR = 50;

  /**
   * ダメージ計算式の基本ダメージオフセット（+ 2 の部分の2）
   * 最小ダメージを保証するための定数
   */
  private static readonly BASE_DAMAGE_OFFSET = 2;

  /**
   * タイプ一致（STAB: Same Type Attack Bonus）の倍率
   */
  private static readonly STAB_MULTIPLIER = 1.5;

  /**
   * タイプ一致なしの場合の倍率
   */
  private static readonly NO_STAB_MULTIPLIER = 1.0;

  /**
   * タイプ相性のデフォルト倍率
   */
  private static readonly DEFAULT_TYPE_EFFECTIVENESS = 1.0;

  /**
   * 天候補正なしの場合の倍率
   */
  private static readonly NO_WEATHER_MULTIPLIER = 1.0;

  /**
   * 晴れの時のほのおタイプ技の倍率
   */
  private static readonly SUN_FIRE_TYPE_MULTIPLIER = 1.5;

  /**
   * 晴れの時のみずタイプ技の倍率
   */
  private static readonly SUN_WATER_TYPE_MULTIPLIER = 0.5;

  /**
   * 雨の時のみずタイプ技の倍率
   */
  private static readonly RAIN_WATER_TYPE_MULTIPLIER = 1.5;

  /**
   * 雨の時のほのおタイプ技の倍率
   */
  private static readonly RAIN_FIRE_TYPE_MULTIPLIER = 0.5;
  /**
   * ダメージを計算
   * @param params ダメージ計算の入力パラメータ
   * @returns ダメージ値（変化技の場合は0）
   */
  static async calculate(params: DamageCalculationParams): Promise<number> {
    // 変化技の場合はダメージ0
    if (params.move.category === 'Status' || params.move.power === null) {
      return 0;
    }

    const move = params.move;
    const attacker = params.attacker;
    const defender = params.defender;

    // レベルは標準バトルレベルを使用
    const level = DamageCalculator.STANDARD_BATTLE_LEVEL;

    // 攻撃側のステータス（物理/特殊で分岐）
    const attackStat =
      move.category === 'Physical'
        ? this.getEffectiveStat(attacker, 'attack', params.attackerStats)
        : this.getEffectiveStat(attacker, 'specialAttack', params.attackerStats);

    // やけどによる物理攻撃補正
    const burnMultiplier = StatusConditionHandler.getPhysicalAttackMultiplier(attacker);
    const finalAttackStat = move.category === 'Physical' ? attackStat * burnMultiplier : attackStat;

    // 防御側のステータス（物理/特殊で分岐）
    const defenseStat =
      move.category === 'Physical'
        ? this.getEffectiveStat(defender, 'defense', params.defenderStats)
        : this.getEffectiveStat(defender, 'specialDefense', params.defenderStats);

    // 基本ダメージ計算: floor((floor((2 * level / 5 + 2) * power * A / D) / 50) + 2)
    const baseDamage = Math.floor(
      Math.floor(
        (((DamageCalculator.LEVEL_MULTIPLIER * level) / DamageCalculator.LEVEL_DIVISOR +
          DamageCalculator.BASE_DAMAGE_OFFSET) *
          move.power *
          finalAttackStat) /
          defenseStat,
      ) /
        DamageCalculator.ATTACK_DEFENSE_DIVISOR +
        DamageCalculator.BASE_DAMAGE_OFFSET,
    );

    // タイプ一致補正（1.5倍または1.0倍）
    const stab = this.calculateStab(params.move.typeId, params.attackerTypes);

    // タイプ相性補正
    const typeEffectiveness = this.calculateTypeEffectiveness(
      params.move.typeId,
      params.defenderTypes,
      params.typeEffectiveness,
    );

    // 防御側の特性によるタイプ無効化チェック
    if (params.defenderAbilityName) {
      const abilityEffect = AbilityRegistry.get(params.defenderAbilityName);
      if (abilityEffect?.isImmuneToType) {
        const battleContext = params.battle
          ? {
              battle: params.battle,
              weather: params.weather,
              field: params.field,
            }
          : undefined;
        const isImmune = abilityEffect.isImmuneToType(
          defender,
          params.moveType.name,
          battleContext,
        );
        // 無効化されている場合はダメージ0を返す
        if (isImmune === true) {
          return 0;
        }
      }
    }

    // ダメージ修正（特性、天候、フィールドなど）
    let damageMultiplier = stab * typeEffectiveness;

    // 攻撃側の特性効果によるダメージ修正
    if (params.attackerAbilityName) {
      const abilityEffect = AbilityRegistry.get(params.attackerAbilityName);
      if (abilityEffect?.modifyDamageDealt) {
        const currentDamage = baseDamage * damageMultiplier;
        const battleContext = params.battle
          ? {
              battle: params.battle,
              weather: params.weather,
              field: params.field,
              moveTypeName: params.moveType.name,
            }
          : undefined;
        const modifiedDamage = await Promise.resolve(
          abilityEffect.modifyDamageDealt(attacker, currentDamage, battleContext),
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
        const currentDamage = baseDamage * damageMultiplier;
        const battleContext = params.battle
          ? {
              battle: params.battle,
              weather: params.weather,
              field: params.field,
              moveTypeName: params.moveType.name,
              moveCategory: params.move.category,
            }
          : undefined;
        const modifiedDamage = abilityEffect.modifyDamage(defender, currentDamage, battleContext);
        if (modifiedDamage !== undefined) {
          damageMultiplier = modifiedDamage / baseDamage;
        }
      }
    }

    // 天候による補正
    damageMultiplier *= this.getWeatherMultiplier(params.moveType, params.weather);

    // 最終ダメージを計算
    const finalDamage = Math.floor(baseDamage * damageMultiplier);

    // タイプ相性が0の場合は0ダメージを返す
    if (typeEffectiveness === 0) {
      return 0;
    }

    // 計算結果が0以下の場合は0を返す（タイプ相性が0.25倍などでダメージが0になる場合を考慮）
    if (finalDamage <= 0) {
      return 0;
    }

    return finalDamage;
  }

  /**
   * ランク補正を考慮した実効ステータスを取得
   * @param status バトル中のポケモンステータス
   * @param statType 取得するステータスの種類
   * @param baseStats 計算済みのステータス値（種族値・個体値・努力値・性格補正を考慮済み）
   * @returns ランク補正を考慮した実効ステータス値
   * @throws Error baseStatsが提供されていない場合
   */
  private static getEffectiveStat(
    status: BattlePokemonStatus,
    statType: 'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed',
    baseStats?: {
      attack: number;
      defense: number;
      specialAttack: number;
      specialDefense: number;
      speed: number;
    },
  ): number {
    // baseStatsは必須（正確なダメージ計算のため）
    if (!baseStats) {
      throw new ValidationException(
        `baseStats must be provided for accurate damage calculation. statType: ${statType}`,
        'baseStats',
      );
    }

    // 実際のステータス値を使用
    let baseStat: number;
    switch (statType) {
      case 'attack':
        baseStat = baseStats.attack;
        break;
      case 'defense':
        baseStat = baseStats.defense;
        break;
      case 'specialAttack':
        baseStat = baseStats.specialAttack;
        break;
      case 'specialDefense':
        baseStat = baseStats.specialDefense;
        break;
      case 'speed':
        baseStat = baseStats.speed;
        break;
      default:
        throw new ValidationException(`Unknown statType: ${statType}`, 'statType');
    }

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
      return DamageCalculator.STAB_MULTIPLIER;
    }
    if (attackerTypes.secondary?.id === moveTypeId) {
      return DamageCalculator.STAB_MULTIPLIER;
    }
    return DamageCalculator.NO_STAB_MULTIPLIER;
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
    let effectiveness = DamageCalculator.DEFAULT_TYPE_EFFECTIVENESS;

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
   *
   * 補正ルール:
   * - 晴れ（Sun）:
   *   - ほのおタイプの技: 1.5倍
   *   - みずタイプの技: 0.5倍
   * - 雨（Rain）:
   *   - みずタイプの技: 1.5倍
   *   - ほのおタイプの技: 0.5倍
   * - 砂嵐（Sandstorm）・あられ（Hail）: 補正なし（1.0倍）
   */
  private static getWeatherMultiplier(moveType: Type, weather: Weather | null): number {
    if (!weather || weather === Weather.None) {
      return DamageCalculator.NO_WEATHER_MULTIPLIER;
    }

    const moveTypeName = moveType.nameEn.toLowerCase();

    switch (weather) {
      case Weather.Sun:
        // 晴れの時、ほのおタイプの技は1.5倍、みずタイプの技は0.5倍
        if (moveTypeName === 'fire') {
          return DamageCalculator.SUN_FIRE_TYPE_MULTIPLIER;
        }
        if (moveTypeName === 'water') {
          return DamageCalculator.SUN_WATER_TYPE_MULTIPLIER;
        }
        return DamageCalculator.NO_WEATHER_MULTIPLIER;

      case Weather.Rain:
        // 雨の時、みずタイプの技は1.5倍、ほのおタイプの技は0.5倍
        if (moveTypeName === 'water') {
          return DamageCalculator.RAIN_WATER_TYPE_MULTIPLIER;
        }
        if (moveTypeName === 'fire') {
          return DamageCalculator.RAIN_FIRE_TYPE_MULTIPLIER;
        }
        return DamageCalculator.NO_WEATHER_MULTIPLIER;

      case Weather.Sandstorm:
      case Weather.Hail:
        // 砂嵐・あられの場合は補正なし（将来的に実装可能）
        return DamageCalculator.NO_WEATHER_MULTIPLIER;

      default:
        return DamageCalculator.NO_WEATHER_MULTIPLIER;
    }
  }
}
