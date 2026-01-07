import { IAbilityEffect } from './ability-effect.interface';
import { IntimidateEffect } from './effects/stat-change/intimidate-effect';
import { SwiftSwimEffect } from './effects/stat-change/swift-swim-effect';
import { ChlorophyllEffect } from './effects/stat-change/chlorophyll-effect';
import { SandRushEffect } from './effects/stat-change/sand-rush-effect';
import { InsomniaEffect } from './effects/immunity/insomnia-effect';
import { LevitateEffect } from './effects/immunity/levitate-effect';
import { VoltAbsorbEffect } from './effects/immunity/volt-absorb-effect';
import { FlashFireEffect } from './effects/immunity/flash-fire-effect';
import { WaterAbsorbEffect } from './effects/immunity/water-absorb-effect';
import { ObliviousEffect } from './effects/oblivious-effect';
import { MultiscaleEffect } from './effects/damage-modify/multiscale-effect';
import { GutsEffect } from './effects/stat-change/guts-effect';
import { GutsHpThresholdEffect } from './effects/stat-change/kongyou-effect';
import { ThickFatEffect } from './effects/damage-modify/thick-fat-effect';
import { SteelworkerEffect } from './effects/damage-modify/steelworker-effect';
import { AdaptabilityEffect } from './effects/damage-modify/adaptability-effect';
import { ShinryokuEffect } from './effects/damage-modify/shinryoku-effect';
import { MoukaEffect } from './effects/damage-modify/mouka-effect';
import { GekiryuuEffect } from './effects/damage-modify/gekiryuu-effect';
import { DrizzleEffect } from './effects/weather/drizzle-effect';
import { DroughtEffect } from './effects/weather/drought-effect';
import { SandStreamEffect } from './effects/weather/sand-stream-effect';
import { SnowWarningEffect } from './effects/weather/snow-warning-effect';
import { MotorDriveEffect } from './effects/weather/motor-drive-effect';
import { PsychicSurgeEffect } from './effects/weather/psychic-surge-effect';
import { MistySurgeEffect } from './effects/weather/misty-surge-effect';
import { GrassySurgeEffect } from './effects/weather/grassy-surge-effect';
import { StickyWebEffect } from './effects/stat-change/sticky-web-effect';
import { PoisonPointEffect } from './effects/stat-change/poison-point-effect';
import { StaticEffect } from './effects/stat-change/static-effect';
import { FlameBodyEffect } from './effects/stat-change/flame-body-effect';
import { MoldBreakerEffect } from './effects/mold-breaker-effect';
import { ImmunityEffect } from './effects/immunity/immunity-effect';
import { OwnTempoEffect } from './effects/immunity/own-tempo-effect';
import { WaterVeilEffect } from './effects/immunity/water-veil-effect';
import { VitalSpiritEffect } from './effects/immunity/vital-spirit-effect';
import { WaterBubbleEffect } from './effects/immunity/water-bubble-effect';
import { CompoundEyesEffect } from './effects/other/compound-eyes-effect';
import { InnerFocusEffect } from './effects/other/inner-focus-effect';
import { LimberEffect } from './effects/other/limber-effect';
import { MagmaArmorEffect } from './effects/other/magma-armor-effect';
import { SteelySpiritEffect } from './effects/damage-modify/steely-spirit-effect';
import { SandForceEffect } from './effects/damage-modify/sand-force-effect';
import { FluffyEffect } from './effects/damage-modify/fluffy-effect';
import { SturdyEffect } from './effects/damage-modify/sturdy-effect';
import { SniperEffect } from './effects/damage-modify/sniper-effect';
import { TechnicianEffect } from './effects/damage-modify/technician-effect';
import { RecklessEffect } from './effects/damage-modify/reckless-effect';
import { SheerForceEffect } from './effects/damage-modify/sheer-force-effect';

/**
 * 特性レジストリ
 * DBのname（文字列キー）と、特性ロジッククラスを紐付けるMap
 *
 * 設計思想:
 * - DBには特性のnameとメタデータ（triggerEvent, effectCategory）のみ保存
 * - 実際のロジック（例: 「攻撃ランクを1段階下げる」）はアプリケーション側で管理
 * - switch文の巨大分岐を避け、拡張可能な設計を実現
 */
export class AbilityRegistry {
  private static registry: Map<string, IAbilityEffect> = new Map();

  /**
   * かたやぶり特性の名前
   * 防御側の特性効果を無視する特性
   * 将来的に類似の特性（テラボルテージ、ターボブレイズなど）を追加する際の拡張性を考慮
   */
  public static readonly MOLD_BREAKER_ABILITY_NAME = 'かたやぶり' as const;

  /**
   * レジストリを初期化
   * アプリケーション起動時に呼び出されることを想定
   * @throws Error 初期化に失敗した場合
   */
  static initialize(): void {
    try {
      // レジストリをクリア（再初期化の場合に備える）
      this.registry.clear();

      // 特性ロジックを登録
      // DBのnameをキーとして、対応するロジッククラスを登録
      this.registry.set('いかく', new IntimidateEffect());
      this.registry.set('マルチスケイル', new MultiscaleEffect());
      this.registry.set('ふみん', new InsomniaEffect());
      this.registry.set('どんかん', new ObliviousEffect());
      this.registry.set('はりきり', new GutsEffect());
      this.registry.set('ふゆう', new LevitateEffect());
      this.registry.set('すいすい', new SwiftSwimEffect());
      this.registry.set('あついしぼう', new ThickFatEffect());
      this.registry.set('ちくでん', new VoltAbsorbEffect());
      this.registry.set('もらいび', new FlashFireEffect());
      this.registry.set('あめふらし', new DrizzleEffect());
      this.registry.set('ひでり', new DroughtEffect());
      this.registry.set('すなあらし', new SandStreamEffect());
      this.registry.set('ゆきふらし', new SnowWarningEffect());
      // でんきエンジン: でんきタイプの技を無効化し、素早さを上げる特性
      this.registry.set('でんきエンジン', new MotorDriveEffect());
      // フィールドカテゴリの特性（フィールド展開）
      this.registry.set('サイコメイカー', new PsychicSurgeEffect());
      this.registry.set('ミストメイカー', new MistySurgeEffect());
      this.registry.set('グラスメイカー', new GrassySurgeEffect());
      this.registry.set('ちょすい', new WaterAbsorbEffect());
      this.registry.set('はがねつかい', new SteelworkerEffect());
      this.registry.set('てきおうりょく', new AdaptabilityEffect());
      this.registry.set('ようりょくそ', new ChlorophyllEffect());
      this.registry.set('すなかき', new SandRushEffect());
      this.registry.set('こんじょう', new GutsHpThresholdEffect());
      this.registry.set('しんりょく', new ShinryokuEffect());
      this.registry.set('もうか', new MoukaEffect());
      this.registry.set('げきりゅう', new GekiryuuEffect());
      this.registry.set('いとあみ', new StickyWebEffect());
      this.registry.set('どくどく', new PoisonPointEffect());
      this.registry.set('せいでんき', new StaticEffect());
      this.registry.set('もうふう', new FlameBodyEffect());
      this.registry.set(this.MOLD_BREAKER_ABILITY_NAME, new MoldBreakerEffect());
      // 無効化カテゴリの特性
      this.registry.set('めんえき', new ImmunityEffect());
      this.registry.set('マイペース', new OwnTempoEffect());
      this.registry.set('みずのベール', new WaterVeilEffect());
      this.registry.set('やるき', new VitalSpiritEffect());
      this.registry.set('すいほう', new WaterBubbleEffect());
      // その他カテゴリの特性
      this.registry.set('ふくがん', new CompoundEyesEffect());
      this.registry.set('せいしんりょく', new InnerFocusEffect());
      this.registry.set('じゅうなん', new LimberEffect());
      this.registry.set('マグマのよろい', new MagmaArmorEffect());
      // ダメージ修正カテゴリの特性
      this.registry.set('はがねのせいしん', new SteelySpiritEffect());
      this.registry.set('すなのちから', new SandForceEffect());
      this.registry.set('もふもふ', new FluffyEffect());
      this.registry.set('がんじょう', new SturdyEffect());
      this.registry.set('スナイパー', new SniperEffect());
      this.registry.set('テクニシャン', new TechnicianEffect());
      this.registry.set('すてみ', new RecklessEffect());
      this.registry.set('ちからずく', new SheerForceEffect());
    } catch (error) {
      throw new Error(
        `Failed to initialize AbilityRegistry: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 特性名からロジックを取得
   * @param abilityName DBから取得した特性のname
   * @returns 特性ロジックインスタンス、または undefined
   */
  static get(abilityName: string): IAbilityEffect | undefined {
    return this.registry.get(abilityName);
  }

  /**
   * 特性ロジックを登録
   * @param abilityName 特性名
   * @param effect 特性ロジックインスタンス
   */
  static register(abilityName: string, effect: IAbilityEffect): void {
    this.registry.set(abilityName, effect);
  }

  /**
   * レジストリに登録されている特性名の一覧を取得（デバッグ用）
   */
  static listRegistered(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * レジストリをクリア（テスト用）
   * 本番環境では使用しないこと
   */
  static clear(): void {
    this.registry.clear();
  }

  /**
   * 攻撃側がかたやぶり特性を持っているかチェック
   * かたやぶり特性は、防御側の特性効果を無視する
   * @param attackerAbilityName 攻撃側の特性名
   * @returns かたやぶり特性を持っている場合はtrue、そうでない場合はfalse
   */
  static hasMoldBreaker(attackerAbilityName?: string): boolean {
    if (!attackerAbilityName) {
      return false;
    }
    return attackerAbilityName === this.MOLD_BREAKER_ABILITY_NAME;
  }
}
