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
import { ChargeEffect } from './effects/charge-effect';
import { NoOpEffect } from './effects/no-op-effect';
import { PsychicTerrainEffect } from './effects/psychic-terrain-effect';
import { PoisonStingEffect } from './effects/poison-sting-effect';
import { PoisonFangEffect } from './effects/poison-fang-effect';
import { PoisonTailEffect } from './effects/poison-tail-effect';
import { PoisonJabEffect } from './effects/poison-jab-effect';
import { CrossPoisonEffect } from './effects/cross-poison-effect';
import { GunkShotEffect } from './effects/gunk-shot-effect';
import { SubmissionEffect } from './effects/submission-effect';
import { BraveBirdEffect } from './effects/brave-bird-effect';
import { HeadSmashEffect } from './effects/head-smash-effect';
import { WoodHammerEffect } from './effects/wood-hammer-effect';
import { WildChargeEffect } from './effects/wild-charge-effect';
import { HeadChargeEffect } from './effects/head-charge-effect';
import { ThunderPunchEffect } from './effects/thunder-punch-effect';
import { BodySlamEffect } from './effects/body-slam-effect';
import { LickEffect } from './effects/lick-effect';
import { SparkEffect } from './effects/spark-effect';
import { SmellingSaltsEffect } from './effects/smelling-salts-effect';
import { VoltTackleEffect } from './effects/volt-tackle-effect';
import { ForcePalmEffect } from './effects/force-palm-effect';
import { FreezeShockEffect } from './effects/freeze-shock-effect';
import { NuzzleEffect } from './effects/nuzzle-effect';
import { BoltStrikeEffect } from './effects/bolt-strike-effect';
import { AncientPowerEffect } from './effects/ancient-power-effect';
import { SilverWindEffect } from './effects/silver-wind-effect';
import { OminousWindEffect } from './effects/ominous-wind-effect';
import { ClearSmogEffect } from './effects/clear-smog-effect';
import { StompEffect } from './effects/stomp-effect';
import { RollingKickEffect } from './effects/rolling-kick-effect';
import { HeadbuttEffect } from './effects/headbutt-effect';
import { BiteEffect } from './effects/bite-effect';
import { BoneClubEffect } from './effects/bone-club-effect';
import { WaterfallEffect } from './effects/waterfall-effect';
import { SkyAttackEffect } from './effects/sky-attack-effect';
import { RockSlideEffect } from './effects/rock-slide-effect';
import { HyperFangEffect } from './effects/hyper-fang-effect';
import { FakeOutEffect } from './effects/fake-out-effect';
import { AstonishEffect } from './effects/astonish-effect';
import { NeedleArmEffect } from './effects/needle-arm-effect';
import { DragonRushEffect } from './effects/dragon-rush-effect';
import { ZenHeadbuttEffect } from './effects/zen-headbutt-effect';
import { IronHeadEffect } from './effects/iron-head-effect';
import { HeartStampEffect } from './effects/heart-stamp-effect';
import { SteamrollerEffect } from './effects/steamroller-effect';
import { IcicleCrashEffect } from './effects/icicle-crash-effect';
import { ZingZapEffect } from './effects/zing-zap-effect';
import { SingEffect } from './effects/sing-effect';
import { HypnosisEffect } from './effects/hypnosis-effect';
import { LovelyKissEffect } from './effects/lovely-kiss-effect';
import { SporeEffect } from './effects/spore-effect';
import { GrassWhistleEffect } from './effects/grass-whistle-effect';
import { DarkVoidEffect } from './effects/dark-void-effect';
import { RestEffect } from './effects/rest-effect';
import { ElectricTerrainEffect } from './effects/electric-terrain-effect';
// Issue #103: 単一ステータス変化系
import { MeditateEffect } from './effects/meditate-effect';
import { SharpenEffect } from './effects/sharpen-effect';
import { HowlEffect } from './effects/howl-effect';
import { WithdrawEffect } from './effects/withdraw-effect';
import { DefenseCurlEffect } from './effects/defense-curl-effect';
import { DoubleTeamEffect } from './effects/double-team-effect';
import { AgilityEffect } from './effects/agility-effect';
import { AmnesiaEffect } from './effects/amnesia-effect';
import { AcidArmorEffect } from './effects/acid-armor-effect';
import { BarrierEffect } from './effects/barrier-effect';
import { IronDefenseEffect } from './effects/iron-defense-effect';
import { MinimizeEffect } from './effects/minimize-effect';
import { RockPolishEffect } from './effects/rock-polish-effect';
import { NastyPlotEffect } from './effects/nasty-plot-effect';
import { AutotomizeEffect } from './effects/autotomize-effect';
import { TailGlowEffect } from './effects/tail-glow-effect';
import { CottonGuardEffect } from './effects/cotton-guard-effect';
import { SandAttackEffect } from './effects/sand-attack-effect';
import { TailWhipEffect } from './effects/tail-whip-effect';
import { LeerEffect } from './effects/leer-effect';
import { KinesisEffect } from './effects/kinesis-effect';
import { FlashEffect } from './effects/flash-effect';
import { SmokescreenEffect } from './effects/smokescreen-effect';
import { SweetScentEffect } from './effects/sweet-scent-effect';
import { PlayNiceEffect } from './effects/play-nice-effect';
import { BabyDollEyesEffect } from './effects/baby-doll-eyes-effect';
import { ConfideEffect } from './effects/confide-effect';
import { StringShotEffect } from './effects/string-shot-effect';
import { ScreechEffect } from './effects/screech-effect';
import { CottonSporeEffect } from './effects/cotton-spore-effect';
import { ScaryFaceEffect } from './effects/scary-face-effect';
import { CharmEffect } from './effects/charm-effect';
import { FeatherDanceEffect } from './effects/feather-dance-effect';
import { FakeTearsEffect } from './effects/fake-tears-effect';
import { MetalSoundEffect } from './effects/metal-sound-effect';
import { EerieImpulseEffect } from './effects/eerie-impulse-effect';
// Issue #103: 複数ステータス変化系
import { GrowthEffect } from './effects/growth-effect';
import { CosmicPowerEffect } from './effects/cosmic-power-effect';
import { BulkUpEffect } from './effects/bulk-up-effect';
import { CalmMindEffect } from './effects/calm-mind-effect';
import { DragonDanceEffect } from './effects/dragon-dance-effect';
import { DefendOrderEffect } from './effects/defend-order-effect';
import { HoneClawsEffect } from './effects/hone-claws-effect';
import { WorkUpEffect } from './effects/work-up-effect';
import { QuiverDanceEffect } from './effects/quiver-dance-effect';
import { CoilEffect } from './effects/coil-effect';
import { ShiftGearEffect } from './effects/shift-gear-effect';
import { ShellSmashEffect } from './effects/shell-smash-effect';
import { TickleEffect } from './effects/tickle-effect';
import { NobleRoarEffect } from './effects/noble-roar-effect';
import { TearfulLookEffect } from './effects/tearful-look-effect';
import { BellyDrumEffect } from './effects/belly-drum-effect';
import { PainSplitEffect } from './effects/pain-split-effect';
import { MementoEffect } from './effects/memento-effect';
import { PowerSwapEffect } from './effects/power-swap-effect';
import { GuardSwapEffect } from './effects/guard-swap-effect';
import { FilletAwayEffect } from './effects/fillet-away-effect';
import { TakeHeartEffect } from './effects/take-heart-effect';

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
      // 変化カテゴリ威力変化系（Issue #122）
      this.registry.set('じゅうでん', new ChargeEffect());
      // 変化カテゴリ「効果なし」系（Issue #113）
      // 何もしない変化技は単一の NoOpEffect インスタンスを複数の技名で共有
      const noOpEffect = new NoOpEffect();
      this.registry.set('はねる', noOpEffect);
      this.registry.set('おいわい', noOpEffect);
      this.registry.set('てをつなぐ', noOpEffect);
      // 変化カテゴリ防御技系（Issue #120）
      this.registry.set('サイコフィールド', new PsychicTerrainEffect());
      // 物理カテゴリどく付与系（Issue #128）
      this.registry.set('どくばり', new PoisonStingEffect());
      this.registry.set('どくどくのキバ', new PoisonFangEffect());
      this.registry.set('ポイズンテール', new PoisonTailEffect());
      this.registry.set('どくづき', new PoisonJabEffect());
      this.registry.set('クロスポイズン', new CrossPoisonEffect());
      this.registry.set('ダストシュート', new GunkShotEffect());
      // 物理カテゴリ反動ダメージ系（Issue #127）
      this.registry.set('じごくぐるま', new SubmissionEffect());
      this.registry.set('ブレイブバード', new BraveBirdEffect());
      this.registry.set('もろはのずつき', new HeadSmashEffect());
      this.registry.set('ウッドハンマー', new WoodHammerEffect());
      this.registry.set('ワイルドボルト', new WildChargeEffect());
      this.registry.set('アフロブレイク', new HeadChargeEffect());
      // 物理カテゴリまひ付与系（Issue #125）
      this.registry.set('かみなりパンチ', new ThunderPunchEffect());
      this.registry.set('のしかかり', new BodySlamEffect());
      this.registry.set('したでなめる', new LickEffect());
      this.registry.set('スパーク', new SparkEffect());
      this.registry.set('きつけ', new SmellingSaltsEffect());
      this.registry.set('ボルテッカー', new VoltTackleEffect());
      this.registry.set('はっけい', new ForcePalmEffect());
      this.registry.set('フリーズボルト', new FreezeShockEffect());
      this.registry.set('ほっぺすりすり', new NuzzleEffect());
      this.registry.set('らいげき', new BoltStrikeEffect());
      // 特殊カテゴリ能力変化系（Issue #99）
      this.registry.set('げんしのちから', new AncientPowerEffect());
      this.registry.set('ぎんいろのかぜ', new SilverWindEffect());
      this.registry.set('あやしいかぜ', new OminousWindEffect());
      this.registry.set('クリアスモッグ', new ClearSmogEffect());
      // 物理カテゴリひるみ付与系（Issue #126）
      this.registry.set('ふみつけ', new StompEffect());
      this.registry.set('まわしげり', new RollingKickEffect());
      this.registry.set('ずつき', new HeadbuttEffect());
      this.registry.set('かみつく', new BiteEffect());
      this.registry.set('ホネこんぼう', new BoneClubEffect());
      this.registry.set('たきのぼり', new WaterfallEffect());
      this.registry.set('ゴッドバード', new SkyAttackEffect());
      this.registry.set('いわなだれ', new RockSlideEffect());
      this.registry.set('ひっさつまえば', new HyperFangEffect());
      this.registry.set('ねこだまし', new FakeOutEffect());
      this.registry.set('おどろかす', new AstonishEffect());
      this.registry.set('ニードルアーム', new NeedleArmEffect());
      this.registry.set('ドラゴンダイブ', new DragonRushEffect());
      this.registry.set('しねんのずつき', new ZenHeadbuttEffect());
      this.registry.set('アイアンヘッド', new IronHeadEffect());
      this.registry.set('ハートスタンプ', new HeartStampEffect());
      this.registry.set('ハードローラー', new SteamrollerEffect());
      this.registry.set('つららおとし', new IcicleCrashEffect());
      this.registry.set('びりびりちくちく', new ZingZapEffect());
      // 変化カテゴリねむり関連（Issue #104）
      this.registry.set('うたう', new SingEffect());
      this.registry.set('さいみんじゅつ', new HypnosisEffect());
      this.registry.set('あくまのキッス', new LovelyKissEffect());
      this.registry.set('キノコのほうし', new SporeEffect());
      this.registry.set('くさぶえ', new GrassWhistleEffect());
      this.registry.set('ダークホール', new DarkVoidEffect());
      this.registry.set('ねむる', new RestEffect());
      this.registry.set('エレキフィールド', new ElectricTerrainEffect());
      // 変化カテゴリ「その他」: 単一ステータス変化系（Issue #103 一部）
      // 自分の能力上昇
      this.registry.set('ヨガのポーズ', new MeditateEffect());
      this.registry.set('かくばる', new SharpenEffect());
      this.registry.set('とおぼえ', new HowlEffect());
      this.registry.set('からにこもる', new WithdrawEffect());
      this.registry.set('まるくなる', new DefenseCurlEffect());
      this.registry.set('かげぶんしん', new DoubleTeamEffect());
      this.registry.set('こうそくいどう', new AgilityEffect());
      this.registry.set('ドわすれ', new AmnesiaEffect());
      this.registry.set('とける', new AcidArmorEffect());
      this.registry.set('バリアー', new BarrierEffect());
      this.registry.set('てっぺき', new IronDefenseEffect());
      this.registry.set('ちいさくなる', new MinimizeEffect());
      this.registry.set('ロックカット', new RockPolishEffect());
      this.registry.set('わるだくみ', new NastyPlotEffect());
      this.registry.set('ボディパージ', new AutotomizeEffect());
      this.registry.set('ほたるび', new TailGlowEffect());
      this.registry.set('コットンガード', new CottonGuardEffect());
      // 相手の能力下降
      this.registry.set('すなかけ', new SandAttackEffect());
      this.registry.set('しっぽをふる', new TailWhipEffect());
      this.registry.set('にらみつける', new LeerEffect());
      this.registry.set('スプーンまげ', new KinesisEffect());
      this.registry.set('フラッシュ', new FlashEffect());
      this.registry.set('えんまく', new SmokescreenEffect());
      this.registry.set('あまいかおり', new SweetScentEffect());
      this.registry.set('なかよくする', new PlayNiceEffect());
      this.registry.set('つぶらなひとみ', new BabyDollEyesEffect());
      this.registry.set('ないしょばなし', new ConfideEffect());
      this.registry.set('いとをはく', new StringShotEffect());
      this.registry.set('いやなおと', new ScreechEffect());
      this.registry.set('わたほうし', new CottonSporeEffect());
      this.registry.set('こわいかお', new ScaryFaceEffect());
      this.registry.set('あまえる', new CharmEffect());
      this.registry.set('フェザーダンス', new FeatherDanceEffect());
      this.registry.set('うそなき', new FakeTearsEffect());
      this.registry.set('きんぞくおん', new MetalSoundEffect());
      this.registry.set('かいでんぱ', new EerieImpulseEffect());
      // 変化カテゴリ「その他」: 複数ステータス変化系（Issue #103 一部）
      this.registry.set('せいちょう', new GrowthEffect());
      this.registry.set('コスモパワー', new CosmicPowerEffect());
      this.registry.set('ビルドアップ', new BulkUpEffect());
      this.registry.set('めいそう', new CalmMindEffect());
      this.registry.set('りゅうのまい', new DragonDanceEffect());
      this.registry.set('ぼうぎょしれい', new DefendOrderEffect());
      this.registry.set('つめとぎ', new HoneClawsEffect());
      this.registry.set('ふるいたてる', new WorkUpEffect());
      this.registry.set('ちょうのまい', new QuiverDanceEffect());
      this.registry.set('とぐろをまく', new CoilEffect());
      this.registry.set('ギアチェンジ', new ShiftGearEffect());
      this.registry.set('からをやぶる', new ShellSmashEffect());
      this.registry.set('くすぐる', new TickleEffect());
      this.registry.set('おたけび', new NobleRoarEffect());
      this.registry.set('なみだめ', new TearfulLookEffect());
      // 変化カテゴリ「その他」: HP 操作系（Issue #103 一部）
      this.registry.set('はらだいこ', new BellyDrumEffect());
      this.registry.set('いたみわけ', new PainSplitEffect());
      this.registry.set('おきみやげ', new MementoEffect());
      // 変化カテゴリ「その他」: 能力交換/HP操作/ステ+治癒の複合系（Issue #103 一部）
      this.registry.set('パワースワップ', new PowerSwapEffect());
      this.registry.set('ガードスワップ', new GuardSwapEffect());
      this.registry.set('みをけずる', new FilletAwayEffect());
      this.registry.set('ブレイブチャージ', new TakeHeartEffect());
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
