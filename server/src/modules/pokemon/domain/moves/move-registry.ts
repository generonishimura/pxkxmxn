import { IMoveEffect } from './move-effect.interface';
import { FlamethrowerEffect } from './effects/flamethrower-effect';
import { ThunderboltEffect } from './effects/thunderbolt-effect';
import { ToxicEffect } from './effects/toxic-effect';
import { IceBeamEffect } from './effects/ice-beam-effect';
import { SleepPowderEffect } from './effects/sleep-powder-effect';
import { AirSlashEffect } from './effects/air-slash-effect';
import { FireFangEffect } from './effects/fire-fang-effect';
import { IceFangEffect } from './effects/ice-fang-effect';
import { ThunderFangEffect } from './effects/thunder-fang-effect';
import { PsychicEffect } from './effects/psychic-effect';
import { ThunderEffect } from './effects/thunder-effect';
import { ThunderShockEffect } from './effects/thunder-shock-effect';
import { FurySwipesEffect } from './effects/fury-swipes-effect';
import { PeckEffect } from './effects/peck-effect';
import { PinMissileEffect } from './effects/pin-missile-effect';
import { DoubleEdgeEffect } from './effects/double-edge-effect';
import { TakeDownEffect } from './effects/take-down-effect';
import { GrowlEffect } from './effects/growl-effect';
import { HardenEffect } from './effects/harden-effect';
import { SwordsDanceEffect } from './effects/swords-dance-effect';
import { RainDanceEffect } from './effects/rain-dance-effect';
import { SunnyDayEffect } from './effects/sunny-day-effect';
import { SandstormMoveEffect } from './effects/sandstorm-effect';
import { HailMoveEffect } from './effects/hail-effect';
import { HazeEffect } from './effects/haze-effect';
import { ExtremeEvoboostEffect } from './effects/extreme-evoboost-effect';
import { AcupressureEffect } from './effects/acupressure-effect';
import { PsychUpEffect } from './effects/psych-up-effect';
import { HeartSwapEffect } from './effects/heart-swap-effect';
import { TopsyTurvyEffect } from './effects/topsy-turvy-effect';
import { PsychoShiftEffect } from './effects/psycho-shift-effect';
import { HealBellEffect } from './effects/heal-bell-effect';
import { AromatherapyEffect } from './effects/aromatherapy-effect';
import { MistyTerrainEffect } from './effects/misty-terrain-effect';
import { HealingWishEffect } from './effects/healing-wish-effect';
import { StuffCheeksEffect } from './effects/stuff-cheeks-effect';
import { MistEffect } from './effects/mist-effect';
import { SafeguardEffect } from './effects/safeguard-effect';
import { SubstituteEffect } from './effects/substitute-effect';
import { EmberEffect } from './effects/ember-effect';
import { FireBlastEffect } from './effects/fire-blast-effect';
import { TriAttackEffect } from './effects/tri-attack-effect';
import { HeatWaveEffect } from './effects/heat-wave-effect';
import { LavaPlumeEffect } from './effects/lava-plume-effect';
import { InfernoEffect } from './effects/inferno-effect';
import { SearingShotEffect } from './effects/searing-shot-effect';
import { ScaldEffect } from './effects/scald-effect';
import { IceBurnEffect } from './effects/ice-burn-effect';
import { SteamEruptionEffect } from './effects/steam-eruption-effect';
import { BlueFlareEffect } from './effects/blue-flare-effect';
import { SparklingAriaEffect } from './effects/sparkling-aria-effect';
import { ScorchingSandsEffect } from './effects/scorching-sands-effect';
import { WillOWispEffect } from './effects/will-o-wisp-effect';
import { RefreshEffect } from './effects/refresh-effect';
import { FirePunchEffect } from './effects/fire-punch-effect';
import { FlameWheelEffect } from './effects/flame-wheel-effect';
import { SacredFireEffect } from './effects/sacred-fire-effect';
import { BlazeKickEffect } from './effects/blaze-kick-effect';
import { FlareBlitzEffect } from './effects/flare-blitz-effect';
import { PyroBallEffect } from './effects/pyro-ball-effect';
import { IcePunchEffect } from './effects/ice-punch-effect';
import { WakeUpSlapEffect } from './effects/wake-up-slap-effect';
import { BlizzardEffect } from './effects/blizzard-effect';
import { PowderSnowEffect } from './effects/powder-snow-effect';
import { TwisterEffect } from './effects/twister-effect';
import { ExtrasensoryEffect } from './effects/extrasensory-effect';
import { DarkPulseEffect } from './effects/dark-pulse-effect';
import { RelicSongEffect } from './effects/relic-song-effect';
import { SnoreEffect } from './effects/snore-effect';
import { ZapCannonEffect } from './effects/zap-cannon-effect';
import { DragonBreathEffect } from './effects/dragon-breath-effect';
import { DischargeEffect } from './effects/discharge-effect';
import { StokedSparksurferEffect } from './effects/stoked-sparksurfer-effect';
import { SmogEffect } from './effects/smog-effect';
import { SludgeEffect } from './effects/sludge-effect';
import { SludgeBombEffect } from './effects/sludge-bomb-effect';
import { SludgeWaveEffect } from './effects/sludge-wave-effect';
import { StunSporeEffect } from './effects/stun-spore-effect';
import { ThunderWaveEffect } from './effects/thunder-wave-effect';
import { GlareEffect } from './effects/glare-effect';
import { PoisonPowderEffect } from './effects/poison-powder-effect';
import { PoisonGasEffect } from './effects/poison-gas-effect';
import { ToxicThreadEffect } from './effects/toxic-thread-effect';
import { SupersonicEffect } from './effects/supersonic-effect';
import { ConfuseRayEffect } from './effects/confuse-ray-effect';
import { SweetKissEffect } from './effects/sweet-kiss-effect';
import { TeeterDanceEffect } from './effects/teeter-dance-effect';
import { SwaggerEffect } from './effects/swagger-effect';
import { FlatterEffect } from './effects/flatter-effect';
import { NoRetreatEffect } from './effects/no-retreat-effect';
import { LightOfRuinEffect } from './effects/light-of-ruin-effect';

/**
 * 技のレジストリ
 * DBのname（文字列キー）と、技の特殊効果ロジッククラスを紐付けるMap
 *
 * 設計思想:
 * - DBには技のnameとメタデータ（power, accuracy, category）のみ保存
 * - 実際の特殊効果ロジック（例: 「10%の確率でやけどを付与する」）はアプリケーション側で管理
 * - switch文の巨大分岐を避け、拡張可能な設計を実現
 */
export class MoveRegistry {
  private static registry: Map<string, IMoveEffect> = new Map();

  /**
   * レジストリを初期化
   * アプリケーション起動時に呼び出されることを想定
   * @throws Error 初期化に失敗した場合
   */
  static initialize(): void {
    try {
      // レジストリをクリア（再初期化の場合に備える）
      this.registry.clear();

      // 技の特殊効果ロジックを登録
      // DBのnameをキーとして、対応するロジッククラスを登録
      this.registry.set('かえんほうしゃ', new FlamethrowerEffect());
      this.registry.set('10まんボルト', new ThunderboltEffect());
      this.registry.set('どくどく', new ToxicEffect());
      this.registry.set('れいとうビーム', new IceBeamEffect());
      this.registry.set('ねむりごな', new SleepPowderEffect());
      this.registry.set('エアスラッシュ', new AirSlashEffect());
      this.registry.set('ほのおのキバ', new FireFangEffect());
      this.registry.set('こおりのキバ', new IceFangEffect());
      this.registry.set('かみなりのキバ', new ThunderFangEffect());
      this.registry.set('サイコキネシス', new PsychicEffect());
      this.registry.set('かみなり', new ThunderEffect());
      this.registry.set('でんきショック', new ThunderShockEffect());
      this.registry.set('みだれひっかき', new FurySwipesEffect());
      this.registry.set('つつく', new PeckEffect());
      this.registry.set('ダブルニードル', new PinMissileEffect());
      this.registry.set('すてみタックル', new DoubleEdgeEffect());
      this.registry.set('とっしん', new TakeDownEffect());
      // ステータス変化系の変化技
      this.registry.set('なきごえ', new GrowlEffect());
      this.registry.set('かたくなる', new HardenEffect());
      this.registry.set('つるぎのまい', new SwordsDanceEffect());
      // 天候変更系の変化技
      this.registry.set('あめをよぶ', new RainDanceEffect());
      this.registry.set('あまごい', new RainDanceEffect()); // Issue #115: あめをよぶの別表記
      this.registry.set('にほんばれ', new SunnyDayEffect());
      this.registry.set('すなあらし', new SandstormMoveEffect());
      this.registry.set('あられ', new HailMoveEffect());
      // 能力変化系の変化技
      this.registry.set('くろいきり', new HazeEffect());
      this.registry.set('ナインエボルブースト', new ExtremeEvoboostEffect());
      this.registry.set('つぼをつく', new AcupressureEffect());
      this.registry.set('じこあんじ', new PsychUpEffect());
      this.registry.set('ハートスワップ', new HeartSwapEffect());
      this.registry.set('ひっくりかえす', new TopsyTurvyEffect());
      this.registry.set('サイコシフト', new PsychoShiftEffect());
      this.registry.set('いやしのすず', new HealBellEffect());
      this.registry.set('アロマセラピー', new AromatherapyEffect());
      this.registry.set('ミストフィールド', new MistyTerrainEffect());
      this.registry.set('いやしのねがい', new HealingWishEffect());
      this.registry.set('ほおばる', new StuffCheeksEffect());
      this.registry.set('しろいきり', new MistEffect());
      this.registry.set('しんぴのまもり', new SafeguardEffect());
      this.registry.set('みがわり', new SubstituteEffect());
      // やけど付与系の特殊技（Issue #93）
      this.registry.set('ひのこ', new EmberEffect());
      this.registry.set('だいもんじ', new FireBlastEffect());
      this.registry.set('トライアタック', new TriAttackEffect());
      this.registry.set('ねっぷう', new HeatWaveEffect());
      this.registry.set('ふんえん', new LavaPlumeEffect());
      this.registry.set('れんごく', new InfernoEffect());
      this.registry.set('かえんだん', new SearingShotEffect());
      this.registry.set('ねっとう', new ScaldEffect());
      this.registry.set('コールドフレア', new IceBurnEffect());
      this.registry.set('スチームバースト', new SteamEruptionEffect());
      this.registry.set('あおいほのお', new BlueFlareEffect());
      this.registry.set('うたかたのアリア', new SparklingAriaEffect());
      this.registry.set('ねっさのだいち', new ScorchingSandsEffect());
      // やけど付与系の変化技（Issue #116）
      this.registry.set('おにび', new WillOWispEffect());
      this.registry.set('リフレッシュ', new RefreshEffect());
      // 物理カテゴリやけど付与系（Issue #123）
      this.registry.set('ほのおのパンチ', new FirePunchEffect());
      this.registry.set('かえんぐるま', new FlameWheelEffect());
      this.registry.set('せいなるほのお', new SacredFireEffect());
      this.registry.set('ブレイズキック', new BlazeKickEffect());
      this.registry.set('フレアドライブ', new FlareBlitzEffect());
      this.registry.set('かえんボール', new PyroBallEffect());
      // 物理カテゴリこおり付与系（Issue #124）
      this.registry.set('れいとうパンチ', new IcePunchEffect());
      // 物理カテゴリねむり関連（Issue #130）
      this.registry.set('めざましビンタ', new WakeUpSlapEffect());
      // 特殊カテゴリこおり付与系（Issue #95）
      this.registry.set('ふぶき', new BlizzardEffect());
      this.registry.set('こなゆき', new PowderSnowEffect());
      // 特殊カテゴリひるみ付与系（Issue #98）
      this.registry.set('たつまき', new TwisterEffect());
      this.registry.set('じんつうりき', new ExtrasensoryEffect());
      this.registry.set('あくのはどう', new DarkPulseEffect());
      // 特殊カテゴリねむり関連（Issue #97）
      this.registry.set('いにしえのうた', new RelicSongEffect());
      this.registry.set('いびき', new SnoreEffect());
      // 特殊カテゴリまひ付与系（Issue #94）
      this.registry.set('でんじほう', new ZapCannonEffect());
      this.registry.set('りゅうのいぶき', new DragonBreathEffect());
      this.registry.set('ほうでん', new DischargeEffect());
      this.registry.set('ライトニングサーフライド', new StokedSparksurferEffect());
      // 特殊カテゴリどく付与系（Issue #96）
      this.registry.set('スモッグ', new SmogEffect());
      this.registry.set('ヘドロこうげき', new SludgeEffect());
      this.registry.set('ヘドロばくだん', new SludgeBombEffect());
      this.registry.set('ヘドロウェーブ', new SludgeWaveEffect());
      // 変化カテゴリまひ付与系（Issue #109）
      this.registry.set('しびれごな', new StunSporeEffect());
      this.registry.set('でんじは', new ThunderWaveEffect());
      this.registry.set('へびにらみ', new GlareEffect());
      // 変化カテゴリどく付与系（Issue #108）
      this.registry.set('どくのこな', new PoisonPowderEffect());
      this.registry.set('どくガス', new PoisonGasEffect());
      this.registry.set('どくのいと', new ToxicThreadEffect());
      // 変化カテゴリこんらん付与系（Issue #105）
      this.registry.set('ちょうおんぱ', new SupersonicEffect());
      this.registry.set('あやしいひかり', new ConfuseRayEffect());
      this.registry.set('てんしのキッス', new SweetKissEffect());
      this.registry.set('フラフラダンス', new TeeterDanceEffect());
      this.registry.set('いばる', new SwaggerEffect());
      this.registry.set('おだてる', new FlatterEffect());
      // 変化カテゴリひるみ付与系（Issue #121）
      this.registry.set('はいすいのじん', new NoRetreatEffect());
      // 特殊カテゴリ反動ダメージ系（Issue #101）
      this.registry.set('はめつのひかり', new LightOfRuinEffect());
    } catch (error) {
      throw new Error(
        `Failed to initialize MoveRegistry: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 技名からロジックを取得
   * @param moveName DBから取得した技のname
   * @returns 技の特殊効果ロジックインスタンス、または undefined
   */
  static get(moveName: string): IMoveEffect | undefined {
    return this.registry.get(moveName);
  }

  /**
   * 技の特殊効果ロジックを登録
   * @param moveName 技名
   * @param effect 技の特殊効果ロジックインスタンス
   */
  static register(moveName: string, effect: IMoveEffect): void {
    this.registry.set(moveName, effect);
  }

  /**
   * レジストリに登録されている技名の一覧を取得（デバッグ用）
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
}
