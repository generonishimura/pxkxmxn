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
