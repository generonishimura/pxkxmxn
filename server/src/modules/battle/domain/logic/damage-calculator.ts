import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { Weather, Field, Battle } from '../entities/battle.entity';
import { StatusConditionHandler } from './status-condition-handler';
import { ValidationException } from '@/shared/domain/exceptions';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { AttackStatOverride } from '@/modules/pokemon/domain/moves/move-effect.interface';
import { modifyByFixedPoint } from './fixed-point-modifier';
import {
  applyStatOverrides,
  basePowerModifierByVolatile,
  ignoresTypeImmunityByVolatile,
  semiInvulnerableDamageMultiplier,
  typeEffectivenessMultiplierByVolatile,
} from './volatile-modifiers';
// 場の状態・設置技・交代の仕組み（Issue #103 #107 #110 #135 一部）
import { SideState, getGlobalFieldState, getSideConditions } from '../state/side-state';
import { isAirborneAbility, isGrounded } from './grounded';
import {
  effectivePrimalWeather,
  fieldBasePowerModifiers,
  isNeutralizedByStrongWinds,
  screenDamageModifier,
  swapDefensesInWonderRoom,
} from './field-modifiers';
// 急所ランクの仕組み（Issue #111 #135 一部）
import { CRITICAL_HIT_DAMAGE_MULTIPLIER } from './critical-hit';

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
  /**
   * ヒット共通のコンテキスト（技名・技フラグ・ランク無視・追加効果など）
   * 特性フックに渡すコンテキストの土台になる。ignoredAttackerRanks / ignoredDefenderRanks はランク補正にも使う
   */
  battleContext?: BattleContext;
  /**
   * 攻撃に使う能力の参照先（イカサマなど）。省略時は攻撃側の攻撃/特攻
   */
  attackStatOverride?: AttackStatOverride;
  /**
   * やけどによる物理技の半減を受けないかどうか（からげんきなど）
   */
  ignoresBurnPenalty?: boolean;
  /**
   * 基礎ダメージ（ダメージ式の +2 のあと）に掛ける倍率（おやこあいの2回目 = 0.25）。4096分率で丸める
   * タイプ一致・タイプ相性・特性・天候の補正は、この倍率を掛けたあとの値に掛かる
   */
  baseDamageRatio?: number;
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
 * - 一時的な状態（volatileState）: 実数値の上書き、みやぶる・ミラクルアイ・ねをはるの相性、
 *   タールショット・でんじふゆう・テレキネシスの相性、じゅうでんの威力、隠れている相手への 2 倍
 * - 場の状態（sideState）: 壁（最後に掛ける）、ワンダールーム、フィールド・どろあそび・みずあそびの威力、
 *   じゅうりょく（ひこう・ふゆうにじめん技が当たる）、らんきりゅう（ひこうタイプの弱点を等倍）
 * - 急所（battleContext.isCriticalHit）: 基礎ダメージを 1.5 倍（切り捨て）。攻撃側の下がったランクと
 *   防御側の上がったランクを 0 として扱う。壁は効かない（本家の getDamage / modifyDamage と同じ）
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
   * じゅうりょくで当たるようになる技のタイプと、当たるようになる相手のタイプ
   */
  private static readonly GROUND_TYPE_NAME = 'じめん';
  private static readonly FLYING_TYPE_NAME = 'ひこう';
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

    // パワートリック・ガードシェアなどの実数値の上書きを反映する（技の実行で反映済みでも、同じ値になる）
    params = this.withStatOverrides(params);
    const move = params.move;
    const attacker = params.attacker;
    const defender = params.defender;

    // レベルは標準バトルレベルを使用
    const level = DamageCalculator.STANDARD_BATTLE_LEVEL;

    // タイプ一致補正（1.5倍または1.0倍）
    const stab = this.calculateStab(params.move.typeId, params.attackerTypes);

    // タイプ相性補正（攻撃側特性の ignoresTypeImmunity・防御側の一時的な状態で相性0を等倍にできる）
    const typeEffectiveness = this.calculateFullTypeEffectiveness(params);

    // 特性フックに渡すコンテキスト
    const hookContext = this.createHookContext(params, typeEffectiveness);

    // 防御側の特性によるタイプ無効化チェック（無効化されている場合はダメージ0を返す）
    if (this.isImmuneByDefenderAbility(params, hookContext)) {
      return 0;
    }

    // 特性による威力補正
    const power = this.resolveBasePower(move.power, params, hookContext);

    const ignoredAttackerRanks = params.battleContext?.ignoredAttackerRanks;
    const ignoredDefenderRanks = params.battleContext?.ignoredDefenderRanks;
    // 急所: 攻撃側の下がったランクと、防御側の上がったランクを 0 として扱う
    const isCriticalHit = params.battleContext?.isCriticalHit === true;

    // 攻撃側のステータス（物理/特殊で分岐、イカサマなどは参照先を変更）
    const attackStatType =
      params.attackStatOverride?.stat ??
      (move.category === 'Physical' ? 'attack' : 'specialAttack');
    const attackSourceIsDefender = params.attackStatOverride?.source === 'defender';
    const attackSource = attackSourceIsDefender ? defender : attacker;
    const attackStat = this.getEffectiveStat(
      attackSource,
      attackStatType,
      attackSourceIsDefender ? params.defenderStats : params.attackerStats,
      (ignoredAttackerRanks?.has(attackStatType) ?? false) ||
        (isCriticalHit && attackSource.getStatRank(attackStatType) < 0),
    );

    // やけどによる物理攻撃補正
    const burnMultiplier = params.ignoresBurnPenalty
      ? 1
      : StatusConditionHandler.getPhysicalAttackMultiplier(attacker);
    const finalAttackStat = move.category === 'Physical' ? attackStat * burnMultiplier : attackStat;

    // 防御側のステータス（物理/特殊で分岐）
    const defenseStatType = move.category === 'Physical' ? 'defense' : 'specialDefense';
    const defenseStat = this.getEffectiveStat(
      defender,
      defenseStatType,
      params.defenderStats,
      (ignoredDefenderRanks?.has(defenseStatType) ?? false) ||
        (isCriticalHit && defender.getStatRank(defenseStatType) > 0),
    );

    // 基本ダメージ計算: floor((floor((2 * level / 5 + 2) * power * A / D) / 50) + 2)
    const formulaDamage = Math.floor(
      Math.floor(
        (((DamageCalculator.LEVEL_MULTIPLIER * level) / DamageCalculator.LEVEL_DIVISOR +
          DamageCalculator.BASE_DAMAGE_OFFSET) *
          power *
          finalAttackStat) /
          defenseStat,
      ) /
        DamageCalculator.ATTACK_DEFENSE_DIVISOR +
        DamageCalculator.BASE_DAMAGE_OFFSET,
    );
    // おやこあいの2回目などの倍率（本家の modifyDamage と同じく、+2 のあとに掛ける）
    const ratioDamage =
      params.baseDamageRatio === undefined
        ? formulaDamage
        : modifyByFixedPoint(formulaDamage, params.baseDamageRatio, 1);
    // 急所の 1.5 倍（本家と同じく補正ではなく、基礎ダメージに掛けて切り捨てる）
    const baseDamage = isCriticalHit
      ? Math.floor(ratioDamage * CRITICAL_HIT_DAMAGE_MULTIPLIER)
      : ratioDamage;
    // 倍率で0になった場合は、ほかの補正を掛けても0（特性の補正の倍率を 0 で割らないよう、ここで返す）
    if (baseDamage <= 0) {
      return 0;
    }

    // ダメージ修正（特性、天候、フィールドなど）
    let damageMultiplier = stab * typeEffectiveness;

    // 攻撃側の特性効果によるダメージ修正
    if (params.attackerAbilityName) {
      const abilityEffect = AbilityRegistry.get(params.attackerAbilityName);
      if (abilityEffect?.modifyDamageDealt) {
        const currentDamage = baseDamage * damageMultiplier;
        const modifiedDamage = await Promise.resolve(
          abilityEffect.modifyDamageDealt(attacker, currentDamage, hookContext),
        );
        if (modifiedDamage !== undefined) {
          damageMultiplier = modifiedDamage / baseDamage;
        }
      }
    }

    // 防御側の特性効果によるダメージ修正
    // 攻撃側がかたやぶりを持っている場合は、防御側の特性効果を無視
    if (
      params.defenderAbilityName &&
      !AbilityRegistry.isIgnoredByMoldBreaker(
        params.attackerAbilityName,
        params.defenderAbilityName,
      )
    ) {
      const abilityEffect = AbilityRegistry.get(params.defenderAbilityName);
      if (abilityEffect?.modifyDamage) {
        const currentDamage = baseDamage * damageMultiplier;
        const modifiedDamage = abilityEffect.modifyDamage(defender, currentDamage, hookContext);
        if (modifiedDamage !== undefined) {
          damageMultiplier = modifiedDamage / baseDamage;
        }
      }
    }

    // 天候による補正
    damageMultiplier *= this.getWeatherMultiplier(params.moveType, params.weather);

    // 隠れている相手への 2 倍（そらをとぶ中のかぜおこし・あなをほる中のじしんなど）
    damageMultiplier *= semiInvulnerableDamageMultiplier(
      defender.volatileState,
      params.battleContext?.moveName,
    );

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

    // 壁（リフレクター・ひかりのかべ・オーロラベール）。本家の ModifyDamage と同じく最後に掛け、最低 1
    const screenModifier = this.resolveScreenModifier(params);
    if (screenModifier !== undefined) {
      return Math.max(1, modifyByFixedPoint(finalDamage, screenModifier));
    }

    return finalDamage;
  }

  /**
   * バトルの sideState（なければ空の状態）
   */
  private static sideStateOf(params: DamageCalculationParams): SideState {
    return (params.battleContext?.battle ?? params.battle)?.sideState ?? {};
  }

  /**
   * じゅうりょくの間か
   */
  private static isGravityActive(params: DamageCalculationParams): boolean {
    return getGlobalFieldState(this.sideStateOf(params)).gravityTurns !== undefined;
  }

  /**
   * 防御側の陣営の壁の補正（4096 分率。効かないときは undefined）
   * 自分を攻撃するとき（こんらんの自傷）・急所・すりぬけには効かない
   */
  private static resolveScreenModifier(params: DamageCalculationParams): number | undefined {
    if (params.attacker.trainerId === params.defender.trainerId) {
      return undefined;
    }
    const infiltrates = params.attackerAbilityName
      ? AbilityRegistry.get(params.attackerAbilityName)?.infiltrates === true
      : false;
    return screenDamageModifier(
      getSideConditions(this.sideStateOf(params), params.defender.trainerId),
      params.move.category,
      { isCriticalHit: params.battleContext?.isCriticalHit === true, infiltrates },
    );
  }

  /**
   * ポケモンが地面にいるか（フィールドの補正に使う）
   */
  private static isPokemonGrounded(
    params: DamageCalculationParams,
    pokemon: BattlePokemonStatus,
    types: { primary: Type; secondary: Type | null },
    abilityName: string | undefined,
  ): boolean {
    return isGrounded({
      typeNames: [types.primary.name, types.secondary?.name].filter(
        (name): name is string => name !== undefined,
      ),
      abilityName,
      volatileState: pokemon.volatileState,
      sideState: this.sideStateOf(params),
    });
  }

  /**
   * 技全体のタイプ相性倍率を返す（0 なら技が相手に効かない）
   * calculate と同じく、攻撃側特性の ignoresTypeImmunity と防御側特性の isImmuneToType を反映する
   * 威力やランクは見ないので、ダメージを計算する前（技の beforeDamage の前）に使える
   */
  static calculateMoveEffectiveness(params: DamageCalculationParams): number {
    const typeEffectiveness = this.calculateFullTypeEffectiveness(params);
    if (typeEffectiveness === 0) {
      return 0;
    }
    const hookContext = this.createHookContext(params, typeEffectiveness);
    return this.isImmuneByDefenderAbility(params, hookContext) ? 0 : typeEffectiveness;
  }

  /**
   * 防御側の特性の isImmuneToType で技のタイプが無効になるか
   * 攻撃側がかたやぶりを持っている場合は、防御側の特性効果を無視する
   */
  private static isImmuneByDefenderAbility(
    params: DamageCalculationParams,
    hookContext: BattleContext | undefined,
  ): boolean {
    if (
      !params.defenderAbilityName ||
      AbilityRegistry.isIgnoredByMoldBreaker(params.attackerAbilityName, params.defenderAbilityName)
    ) {
      return false;
    }
    // じゅうりょくの間は、ふゆうでもじめん技を受ける（地面にいるため）
    if (
      params.moveType.name === DamageCalculator.GROUND_TYPE_NAME &&
      isAirborneAbility(params.defenderAbilityName) &&
      this.isGravityActive(params)
    ) {
      return false;
    }
    const abilityEffect = AbilityRegistry.get(params.defenderAbilityName);
    return (
      abilityEffect?.isImmuneToType?.(params.defender, params.moveType.name, hookContext) === true
    );
  }

  /**
   * 特性フックに渡すコンテキストを作成
   * params.battleContext を土台に、このヒットで決まった値（タイプ・威力・相性など）を上書きする
   * バトル情報がない場合はundefined
   */
  private static createHookContext(
    params: DamageCalculationParams,
    typeEffectiveness: number,
  ): BattleContext | undefined {
    const battle = params.battleContext?.battle ?? params.battle;
    if (!battle) {
      return undefined;
    }
    return {
      ...params.battleContext,
      battle,
      weather: params.weather,
      field: params.field,
      moveTypeName: params.moveType.name,
      moveCategory: params.move.category,
      movePower: params.move.power,
      typeEffectiveness,
      attacker: params.attacker,
      defender: params.defender,
      attackerStats: params.attackerStats,
      defenderStats: params.defenderStats,
      attackerAbilityName: params.attackerAbilityName,
      defenderAbilityName: params.defenderAbilityName,
    };
  }

  /**
   * 特性による威力補正を適用した威力を返す
   * 1. 攻撃側特性の modifyBasePower
   * 2. 場の特性（攻撃側・防御側）の modifyAnyBasePower（同じ特性は1回だけ）
   */
  private static resolveBasePower(
    basePower: number,
    params: DamageCalculationParams,
    hookContext: BattleContext | undefined,
  ): number {
    let power = basePower;

    if (params.attackerAbilityName) {
      const modified = AbilityRegistry.get(params.attackerAbilityName)?.modifyBasePower?.(
        params.attacker,
        power,
        hookContext,
      );
      if (modified !== undefined) {
        power = modified;
      }
    }

    const holders: Array<{ abilityName: string; holder: BattlePokemonStatus }> = [];
    if (params.attackerAbilityName) {
      holders.push({ abilityName: params.attackerAbilityName, holder: params.attacker });
    }
    if (params.defenderAbilityName && params.defenderAbilityName !== params.attackerAbilityName) {
      holders.push({ abilityName: params.defenderAbilityName, holder: params.defender });
    }
    for (const { abilityName, holder } of holders) {
      const modified = AbilityRegistry.get(abilityName)?.modifyAnyBasePower?.(
        holder,
        power,
        hookContext,
      );
      if (modified !== undefined) {
        power = modified;
      }
    }

    // じゅうでん・でんきにかえる・ふうりょくでんき（でんき技の威力 2 倍）
    const volatileModifier = basePowerModifierByVolatile(
      params.attacker.volatileState,
      params.moveType.name,
    );
    if (volatileModifier !== undefined) {
      power = modifyByFixedPoint(power, volatileModifier);
    }

    // フィールド（エレキ・グラス・サイコ・ミスト）・どろあそび・みずあそび
    const fieldModifiers = fieldBasePowerModifiers({
      field: params.field ?? params.battle?.field,
      sideState: this.sideStateOf(params),
      moveTypeName: params.moveType.name,
      moveName: params.battleContext?.moveName,
      attackerGrounded: this.isPokemonGrounded(
        params,
        params.attacker,
        params.attackerTypes,
        params.attackerAbilityName,
      ),
      defenderGrounded: this.isPokemonGrounded(
        params,
        params.defender,
        params.defenderTypes,
        params.defenderAbilityName,
      ),
      attackerSemiInvulnerable: params.attacker.volatileState.semiInvulnerable !== undefined,
      defenderSemiInvulnerable: params.defender.volatileState.semiInvulnerable !== undefined,
    });
    for (const modifier of fieldModifiers) {
      power = modifyByFixedPoint(power, modifier);
    }

    return power;
  }

  /**
   * 実数値の上書き（volatileState.statOverrides）を、攻撃側・防御側の実数値に反映したパラメータを返す
   */
  private static withStatOverrides(params: DamageCalculationParams): DamageCalculationParams {
    // ワンダールームの間は、上書きを反映したあとの防御と特防の実数値を入れ替える（ランクは入れ替えない）
    const sideState = this.sideStateOf(params);
    return {
      ...params,
      attackerStats: params.attackerStats
        ? swapDefensesInWonderRoom(
            applyStatOverrides(params.attackerStats, params.attacker.volatileState),
            sideState,
          )
        : params.attackerStats,
      defenderStats: params.defenderStats
        ? swapDefensesInWonderRoom(
            applyStatOverrides(params.defenderStats, params.defender.volatileState),
            sideState,
          )
        : params.defenderStats,
    };
  }

  /**
   * タイプ相性を、特性と一時的な状態を含めて求める
   * 1. タイプ相性表（相性0は、攻撃側特性の ignoresTypeImmunity・防御側のみやぶるなどで等倍にできる）
   * 2. 防御側の一時的な状態の倍率（タールショットのほのお 2 倍、でんじふゆう・テレキネシスのじめん 0 倍）
   */
  private static calculateFullTypeEffectiveness(params: DamageCalculationParams): number {
    // じゅうりょくの間は、じめん技がひこうタイプ・でんじふゆう・テレキネシスにも当たる（地面にいるため）
    const groundedByGravity =
      params.moveType.name === DamageCalculator.GROUND_TYPE_NAME && this.isGravityActive(params);
    const primal = effectivePrimalWeather(this.sideStateOf(params), [
      params.attackerAbilityName,
      params.defenderAbilityName,
    ]);
    const effectiveness = this.calculateTypeEffectiveness(
      params.move.typeId,
      params.defenderTypes,
      params.typeEffectiveness,
      defenderType =>
        (groundedByGravity && defenderType.name === DamageCalculator.FLYING_TYPE_NAME) ||
        this.ignoresTypeImmunity(params, defenderType) ||
        ignoresTypeImmunityByVolatile(
          params.defender.volatileState,
          params.moveType.name,
          defenderType.name,
        ),
      // らんきりゅう: ひこうタイプへの弱点を等倍にする
      (defenderType, multiplier) =>
        isNeutralizedByStrongWinds(primal, defenderType.name, multiplier, params.move.category)
          ? 1
          : multiplier,
    );
    if (groundedByGravity) {
      return effectiveness;
    }
    return (
      effectiveness *
      typeEffectivenessMultiplierByVolatile(params.defender.volatileState, params.moveType.name)
    );
  }

  /**
   * 攻撃側特性の ignoresTypeImmunity で、相性0のタイプを等倍として扱うかどうか
   */
  private static ignoresTypeImmunity(params: DamageCalculationParams, defenderType: Type): boolean {
    if (!params.attackerAbilityName) {
      return false;
    }
    const abilityEffect = AbilityRegistry.get(params.attackerAbilityName);
    const battle = params.battleContext?.battle ?? params.battle;
    const context = battle ? { ...params.battleContext, battle } : undefined;
    return (
      abilityEffect?.ignoresTypeImmunity?.(
        params.attacker,
        params.moveType.name,
        defenderType.name,
        context,
      ) === true
    );
  }

  /**
   * ランク補正を考慮した実効ステータスを取得
   * @param status バトル中のポケモンステータス
   * @param statType 取得するステータスの種類
   * @param baseStats 計算済みのステータス値（種族値・個体値・努力値・性格補正を考慮済み）
   * @param ignoreRank trueの場合はランク補正を掛けない（てんねん、なしくずしなど）
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
    ignoreRank: boolean = false,
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

    const multiplier = ignoreRank ? 1 : status.getStatMultiplier(statType);
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
    ignoresImmunity: (defenderType: Type) => boolean = () => false,
    adjust: (defenderType: Type, multiplier: number) => number = (_type, multiplier) => multiplier,
  ): number {
    let effectiveness = DamageCalculator.DEFAULT_TYPE_EFFECTIVENESS;

    const defenderTypeList = defenderTypes.secondary
      ? [defenderTypes.primary, defenderTypes.secondary]
      : [defenderTypes.primary];
    for (const defenderType of defenderTypeList) {
      const typeMultiplier = typeEffectiveness.get(`${moveTypeId}-${defenderType.id}`);
      if (typeMultiplier === undefined) {
        continue;
      }
      // 相性0でも、攻撃側特性が許す場合は等倍として扱う
      if (typeMultiplier === 0 && ignoresImmunity(defenderType)) {
        continue;
      }
      effectiveness *= adjust(defenderType, typeMultiplier);
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
