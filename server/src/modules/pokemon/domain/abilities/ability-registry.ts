import { IAbilityEffect } from './ability-effect.interface';
import { IntimidateEffect } from './effects/stat-change/intimidate-effect';
import { SwiftSwimEffect } from './effects/stat-change/swift-swim-effect';
import { ChlorophyllEffect } from './effects/stat-change/chlorophyll-effect';
import { SandRushEffect } from './effects/stat-change/sand-rush-effect';
import { SlushRushEffect } from './effects/stat-change/slush-rush-effect';
import { SurgeSurferEffect } from './effects/stat-change/surge-surfer-effect';
import { SandVeilEffect } from './effects/stat-change/sand-veil-effect';
import { SnowCloakEffect } from './effects/stat-change/snow-cloak-effect';
import { InsomniaEffect } from './effects/immunity/insomnia-effect';
import { LevitateEffect } from './effects/immunity/levitate-effect';
import { VoltAbsorbEffect } from './effects/immunity/volt-absorb-effect';
import { FlashFireEffect } from './effects/immunity/flash-fire-effect';
import { WaterAbsorbEffect } from './effects/immunity/water-absorb-effect';
import { SapSipperEffect } from './effects/immunity/sap-sipper-effect';
import { LightningRodEffect } from './effects/immunity/lightning-rod-effect';
import { StormDrainEffect } from './effects/immunity/storm-drain-effect';
import { HydrationEffect } from './effects/immunity/hydration-effect';
import { ShedSkinEffect } from './effects/immunity/shed-skin-effect';
import { LeafGuardEffect } from './effects/immunity/leaf-guard-effect';
import { ObliviousEffect } from './effects/oblivious-effect';
import { MultiscaleEffect } from './effects/damage-modify/multiscale-effect';
import { GutsEffect } from './effects/stat-change/guts-effect';
import { GutsHpThresholdEffect } from './effects/stat-change/kongyou-effect';
import { ThickFatEffect } from './effects/damage-modify/thick-fat-effect';
import { HeatproofEffect } from './effects/damage-modify/heatproof-effect';
import { SpeedBoostEffect } from './effects/stat-change/speed-boost-effect';
import { MarvelScaleEffect } from './effects/damage-modify/marvel-scale-effect';
import { SteelworkerEffect } from './effects/damage-modify/steelworker-effect';
import { AdaptabilityEffect } from './effects/damage-modify/adaptability-effect';
import { ShinryokuEffect } from './effects/damage-modify/shinryoku-effect';
import { MoukaEffect } from './effects/damage-modify/mouka-effect';
import { GekiryuuEffect } from './effects/damage-modify/gekiryuu-effect';
import { SwarmEffect } from './effects/damage-modify/swarm-effect';
import { ToxicBoostEffect } from './effects/damage-modify/toxic-boost-effect';
import { FlareBoostEffect } from './effects/damage-modify/flare-boost-effect';
import { DrizzleEffect } from './effects/weather/drizzle-effect';
import { RainDishEffect } from './effects/weather/rain-dish-effect';
import { IceBodyEffect } from './effects/weather/ice-body-effect';
import { DroughtEffect } from './effects/weather/drought-effect';
import { SandStreamEffect } from './effects/weather/sand-stream-effect';
import { SnowWarningEffect } from './effects/weather/snow-warning-effect';
import { MotorDriveEffect } from './effects/weather/motor-drive-effect';
import { PsychicSurgeEffect } from './effects/weather/psychic-surge-effect';
import { MistySurgeEffect } from './effects/weather/misty-surge-effect';
import { GrassySurgeEffect } from './effects/weather/grassy-surge-effect';
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
import { PranksterEffect } from './effects/other/prankster-effect';
import { NoGuardEffect } from './effects/other/no-guard-effect';
import { NaturalCureEffect } from './effects/other/natural-cure-effect';
import { RegeneratorEffect } from './effects/other/regenerator-effect';
import { NoBattleEffectAbility } from './effects/other/no-battle-effect-ability';
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
import { HugePowerEffect } from './effects/stat-change/huge-power-effect';
import { QuickFeetEffect } from './effects/stat-change/quick-feet-effect';
import { BigPecksEffect } from './effects/stat-change/big-pecks-effect';
import { ClearBodyEffect } from './effects/stat-change/clear-body-effect';
import { ScrappyEffect } from './effects/stat-change/scrappy-effect';
import { DefiantEffect } from './effects/stat-change/defiant-effect';
import { CompetitiveEffect } from './effects/stat-change/competitive-effect';
import { BerserkEffect } from './effects/stat-change/berserk-effect';
import { HyperCutterEffect } from './effects/stat-change/hyper-cutter-effect';
import { KeenEyeEffect } from './effects/stat-change/keen-eye-effect';
import { FurCoatEffect } from './effects/damage-modify/fur-coat-effect';
import { RoughSkinEffect } from './effects/other/rough-skin-effect';
import { AftermathEffect } from './effects/other/aftermath-effect';
import { GooeyEffect } from './effects/stat-change/gooey-effect';
import { TanglingHairEffect } from './effects/stat-change/tangling-hair-effect';
import { WeakArmorEffect } from './effects/stat-change/weak-armor-effect';
import { EffectSporeEffect } from './effects/stat-change/effect-spore-effect';
import { TransistorEffect } from './effects/damage-modify/transistor-effect';
import { DragonsMawEffect } from './effects/damage-modify/dragons-maw-effect';
import { RockyPayloadEffect } from './effects/damage-modify/rocky-payload-effect';
import { GrassPeltEffect } from './effects/damage-modify/grass-pelt-effect';
import { IceScalesEffect } from './effects/damage-modify/ice-scales-effect';
import { SolarPowerEffect } from './effects/damage-modify/solar-power-effect';
import { DefeatistEffect } from './effects/damage-modify/defeatist-effect';
import { VesselOfRuinEffect } from './effects/damage-modify/vessel-of-ruin-effect';
import { SwordOfRuinEffect } from './effects/damage-modify/sword-of-ruin-effect';
import { TabletsOfRuinEffect } from './effects/damage-modify/tablets-of-ruin-effect';
import { BeadsOfRuinEffect } from './effects/damage-modify/beads-of-ruin-effect';
import { FlowerGiftEffect } from './effects/damage-modify/flower-gift-effect';
import { PurifyingSaltEffect } from './effects/immunity/purifying-salt-effect';
import { ElectricSurgeEffect } from './effects/weather/electric-surge-effect';
import { OrichalcumPulseEffect } from './effects/weather/orichalcum-pulse-effect';
import { HadronEngineEffect } from './effects/weather/hadron-engine-effect';
import { IntrepidSwordEffect } from './effects/stat-change/intrepid-sword-effect';
import { DauntlessShieldEffect } from './effects/stat-change/dauntless-shield-effect';
import { SupersweetSyrupEffect } from './effects/stat-change/supersweet-syrup-effect';
import { EarthEaterEffect } from './effects/immunity/earth-eater-effect';
import { DrySkinEffect } from './effects/immunity/dry-skin-effect';
import { WellBakedBodyEffect } from './effects/immunity/well-baked-body-effect';
import { TangledFeetEffect } from './effects/stat-change/tangled-feet-effect';
import { StallEffect } from './effects/stat-change/stall-effect';
import { BadDreamsEffect } from './effects/other/bad-dreams-effect';
import { MoodyEffect } from './effects/stat-change/moody-effect';
import { VictoryStarEffect } from './effects/other/victory-star-effect';
import { SweetVeilEffect } from './effects/immunity/sweet-veil-effect';
import { PastelVeilEffect } from './effects/immunity/pastel-veil-effect';
// 反動を受けない特性（Issue #135 一部）
import { RockHeadEffect } from './effects/other/rock-head-effect';
import { MagicGuardEffect } from './effects/other/magic-guard-effect';
// 能力ランクの変化を変える・写す特性（Issue #135 一部）
import { SimpleEffect } from './effects/stat-change/simple-effect';
import { ContraryEffect } from './effects/stat-change/contrary-effect';
import { MirrorArmorEffect } from './effects/stat-change/mirror-armor-effect';

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
      // たいねつ / かそく（Issue #84 一部）
      this.registry.set('たいねつ', new HeatproofEffect());
      this.registry.set('かそく', new SpeedBoostEffect());
      // ふしぎなうろこ: 状態異常時に物理ダメージ軽減（Issue #84 一部）
      this.registry.set('ふしぎなうろこ', new MarvelScaleEffect());
      this.registry.set('ちくでん', new VoltAbsorbEffect());
      this.registry.set('もらいび', new FlashFireEffect());
      this.registry.set('あめふらし', new DrizzleEffect());
      this.registry.set('ひでり', new DroughtEffect());
      this.registry.set('すなおこし', new SandStreamEffect());
      this.registry.set('ゆきふらし', new SnowWarningEffect());
      // 天候依存の HP 回復特性（Issue #84 一部）
      this.registry.set('あめうけざら', new RainDishEffect());
      this.registry.set('アイスボディ', new IceBodyEffect());
      // でんきエンジン: でんきタイプの技を無効化し、素早さを上げる特性
      this.registry.set('でんきエンジン', new MotorDriveEffect());
      // フィールドカテゴリの特性（フィールド展開）
      this.registry.set('サイコメイカー', new PsychicSurgeEffect());
      this.registry.set('ミストメイカー', new MistySurgeEffect());
      this.registry.set('グラスメイカー', new GrassySurgeEffect());
      this.registry.set('ちょすい', new WaterAbsorbEffect());
      // そうしょく: くさ無効 + 攻撃 +1（Issue #84 一部、Motor Drive と同パターン）
      this.registry.set('そうしょく', new SapSipperEffect());
      // タイプ無効化 + 特攻 +1（Issue #84 一部）
      this.registry.set('ひらいしん', new LightningRodEffect());
      this.registry.set('よびみず', new StormDrainEffect());
      this.registry.set('はがねつかい', new SteelworkerEffect());
      this.registry.set('てきおうりょく', new AdaptabilityEffect());
      this.registry.set('ようりょくそ', new ChlorophyllEffect());
      this.registry.set('すなかき', new SandRushEffect());
      // 天候/フィールド依存 SPE2倍特性（Issue #84 一部、ようりょくそ・すいすい・すなかきと同パターン）
      this.registry.set('ゆきかき', new SlushRushEffect());
      this.registry.set('サーフテール', new SurgeSurferEffect());
      // 天候依存の回避率ブースト（Issue #84 一部）
      this.registry.set('すながくれ', new SandVeilEffect());
      this.registry.set('ゆきがくれ', new SnowCloakEffect());
      this.registry.set('こんじょう', new GutsHpThresholdEffect());
      this.registry.set('しんりょく', new ShinryokuEffect());
      this.registry.set('もうか', new MoukaEffect());
      this.registry.set('げきりゅう', new GekiryuuEffect());
      // むしのしらせ: HP 1/3 以下でむし技 1.5 倍（しんりょく/もうか/げきりゅうと同パターン、Issue #84 一部）
      this.registry.set('むしのしらせ', new SwarmEffect());
      // 状態異常時にダメージ 1.5 倍する特性（Issue #84 一部）
      this.registry.set('どくぼうそう', new ToxicBoostEffect());
      this.registry.set('ねつぼうそう', new FlareBoostEffect());
      this.registry.set('どくのトゲ', new PoisonPointEffect());
      this.registry.set('せいでんき', new StaticEffect());
      this.registry.set('ほのおのからだ', new FlameBodyEffect());
      this.registry.set(this.MOLD_BREAKER_ABILITY_NAME, new MoldBreakerEffect());
      // 無効化カテゴリの特性
      this.registry.set('めんえき', new ImmunityEffect());
      this.registry.set('マイペース', new OwnTempoEffect());
      this.registry.set('みずのベール', new WaterVeilEffect());
      this.registry.set('やるき', new VitalSpiritEffect());
      this.registry.set('すいほう', new WaterBubbleEffect());
      // ターン終了時の自己状態異常治癒（Issue #84 一部）
      this.registry.set('うるおいボディ', new HydrationEffect());
      this.registry.set('だっぴ', new ShedSkinEffect());
      // リーフガード: 晴天時に全主要状態異常を無効化（Issue #84 一部）
      this.registry.set('リーフガード', new LeafGuardEffect());
      // その他カテゴリの特性
      this.registry.set('ふくがん', new CompoundEyesEffect());
      // 優先度+命中率系（Issue #84 一部）
      this.registry.set('いたずらごころ', new PranksterEffect());
      this.registry.set('ノーガード', new NoGuardEffect());
      // 場から下がるとき発動（Issue #84 一部）
      this.registry.set('しぜんかいふく', new NaturalCureEffect());
      this.registry.set('さいせいりょく', new RegeneratorEffect());
      // バトル中効果なしの特性（Issue #84 一部）
      // 単一の NoBattleEffectAbility インスタンスを複数の特性で共有
      const noBattleEffect = new NoBattleEffectAbility();
      this.registry.set('にげあし', noBattleEffect);
      this.registry.set('はっこう', noBattleEffect);
      this.registry.set('みつあつめ', noBattleEffect);
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
      // ステータス変化カテゴリの特性
      this.registry.set('ちからもち', new HugePowerEffect());
      // ヨガパワー: ちからもちと同効果（物理攻撃 2 倍）（Issue #84 一部）
      this.registry.set('ヨガパワー', new HugePowerEffect());
      this.registry.set('はやあし', new QuickFeetEffect());
      this.registry.set('はとむね', new BigPecksEffect());
      // クリアボディ / しろいけむり: 能力ランク低下無効化マーカー（Issue #84 一部、BigPecks と同パターン）
      const clearBody = new ClearBodyEffect();
      this.registry.set('クリアボディ', clearBody);
      this.registry.set('しろいけむり', clearBody);
      this.registry.set('きもったま', new ScrappyEffect());
      this.registry.set('まけんき', new DefiantEffect());
      this.registry.set('かちき', new CompetitiveEffect());
      this.registry.set('ぎゃくじょう', new BerserkEffect());
      // 特定の能力ランクが下がらない特性（Issue #84 一部、はとむねと同パターン）
      this.registry.set('かいりきバサミ', new HyperCutterEffect());
      this.registry.set('するどいめ', new KeenEyeEffect());
      // ファーコート: 物理ダメージ半減（Issue #84 一部、ふしぎなうろこと同パターン）
      this.registry.set('ファーコート', new FurCoatEffect());
      // 接触時に発動する特性（Issue #135 一部）
      this.registry.set('さめはだ', new RoughSkinEffect());
      this.registry.set('ゆうばく', new AftermathEffect());
      this.registry.set('ぬめぬめ', new GooeyEffect());
      this.registry.set('カーリーヘアー', new TanglingHairEffect());
      this.registry.set('くだけるよろい', new WeakArmorEffect());
      this.registry.set('ほうし', new EffectSporeEffect());
      // ダメージ補正特性（タイプ・天候・HP）（Issue #135 一部）
      this.registry.set('トランジスタ', new TransistorEffect());
      this.registry.set('りゅうのあぎと', new DragonsMawEffect());
      this.registry.set('いわはこび', new RockyPayloadEffect());
      this.registry.set('くさのけがわ', new GrassPeltEffect());
      this.registry.set('こおりのりんぷん', new IceScalesEffect());
      this.registry.set('サンパワー', new SolarPowerEffect());
      this.registry.set('よわき', new DefeatistEffect());
      // わざわい系・フラワーギフト・きよめのしお（Issue #135 一部）
      this.registry.set('わざわいのうつわ', new VesselOfRuinEffect());
      this.registry.set('わざわいのつるぎ', new SwordOfRuinEffect());
      this.registry.set('わざわいのおふだ', new TabletsOfRuinEffect());
      this.registry.set('わざわいのたま', new BeadsOfRuinEffect());
      this.registry.set('フラワーギフト', new FlowerGiftEffect());
      this.registry.set('きよめのしお', new PurifyingSaltEffect());
      // 登場時・無効化系の特性（Issue #135 一部）
      this.registry.set('エレキメイカー', new ElectricSurgeEffect());
      this.registry.set('ひひいろのこどう', new OrichalcumPulseEffect());
      this.registry.set('ハドロンエンジン', new HadronEngineEffect());
      this.registry.set('ふとうのけん', new IntrepidSwordEffect());
      this.registry.set('ふくつのたて', new DauntlessShieldEffect());
      this.registry.set('かんろなミツ', new SupersweetSyrupEffect());
      this.registry.set('どしょく', new EarthEaterEffect());
      this.registry.set('かんそうはだ', new DrySkinEffect());
      this.registry.set('こんがりボディ', new WellBakedBodyEffect());
      // その他の特性（Issue #135 一部）
      this.registry.set('ちどりあし', new TangledFeetEffect());
      this.registry.set('あとだし', new StallEffect());
      this.registry.set('ナイトメア', new BadDreamsEffect());
      this.registry.set('ムラっけ', new MoodyEffect());
      this.registry.set('しょうりのほし', new VictoryStarEffect());
      this.registry.set('スイートベール', new SweetVeilEffect());
      this.registry.set('パステルベール', new PastelVeilEffect());
      // メタルプロテクト: クリアボディと同効果、ファントムガード: マルチスケイルと同効果
      this.registry.set('メタルプロテクト', clearBody);
      this.registry.set('ファントムガード', new MultiscaleEffect());
      // シングルバトルで効果のない特性・技（ダブル専用含む）（Issue #135 一部）
      // 情報表示のみ・野生バトル専用・ダブルバトル専用の特性は NoBattleEffectAbility を共有
      this.registry.set('きけんよち', noBattleEffect);
      this.registry.set('よちむ', noBattleEffect);
      this.registry.set('たまひろい', noBattleEffect);
      this.registry.set('プラス', noBattleEffect);
      this.registry.set('マイナス', noBattleEffect);
      this.registry.set('いやしのこころ', noBattleEffect);
      this.registry.set('フレンドガード', noBattleEffect);
      this.registry.set('テレパシー', noBattleEffect);
      this.registry.set('フラワーベール', noBattleEffect);
      this.registry.set('きょうせい', noBattleEffect);
      this.registry.set('バッテリー', noBattleEffect);
      this.registry.set('レシーバー', noBattleEffect);
      this.registry.set('かがくのちから', noBattleEffect);
      this.registry.set('スクリューおびれ', noBattleEffect);
      this.registry.set('すじがねいり', noBattleEffect);
      this.registry.set('パワースポット', noBattleEffect);
      this.registry.set('きみょうなくすり', noBattleEffect);
      this.registry.set('しれいとう', noBattleEffect);
      this.registry.set('きょうえん', noBattleEffect);
      this.registry.set('おもてなし', noBattleEffect);
      // 反動を受けない特性（Issue #135 一部）
      this.registry.set('いしあたま', new RockHeadEffect());
      this.registry.set('マジックガード', new MagicGuardEffect());
      // 能力ランクの変化を変える・写す特性（Issue #135 一部）
      this.registry.set('たんじゅん', new SimpleEffect());
      this.registry.set('あまのじゃく', new ContraryEffect());
      this.registry.set('ミラーアーマー', new MirrorArmorEffect());
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
   * 攻撃側がかたやぶり系の特性を持っているかチェック
   * かたやぶり系の特性（breaksMold が true の特性）は、防御側の特性効果を無視する
   * @param attackerAbilityName 攻撃側の特性名
   * @returns かたやぶり系の特性を持っている場合はtrue、そうでない場合はfalse
   */
  static hasMoldBreaker(attackerAbilityName?: string): boolean {
    if (!attackerAbilityName) {
      return false;
    }
    if (attackerAbilityName === this.MOLD_BREAKER_ABILITY_NAME) {
      return true;
    }
    return this.registry.get(attackerAbilityName)?.breaksMold === true;
  }

  /**
   * 防御側の特性が、攻撃側のかたやぶり系の特性で無視されるかチェック
   * unaffectedByMoldBreaker が true の特性（プリズムアーマーなど）は無視されない
   * @param attackerAbilityName 攻撃側の特性名
   * @param defenderAbilityName 防御側の特性名
   * @returns 防御側の特性を無視する場合はtrue
   */
  static isIgnoredByMoldBreaker(
    attackerAbilityName?: string,
    defenderAbilityName?: string,
  ): boolean {
    if (!this.hasMoldBreaker(attackerAbilityName)) {
      return false;
    }
    if (!defenderAbilityName) {
      return true;
    }
    return this.registry.get(defenderAbilityName)?.unaffectedByMoldBreaker !== true;
  }
}
