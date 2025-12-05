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
import { KongyouEffect } from './effects/stat-change/kongyou-effect';
import { ThickFatEffect } from './effects/damage-modify/thick-fat-effect';
import { SteelworkerEffect } from './effects/damage-modify/steelworker-effect';
import { ShinryokuEffect } from './effects/damage-modify/shinryoku-effect';
import { MoukaEffect } from './effects/damage-modify/mouka-effect';
import { GekiryuuEffect } from './effects/damage-modify/gekiryuu-effect';
import { DrizzleEffect } from './effects/weather/drizzle-effect';
import { DroughtEffect } from './effects/weather/drought-effect';
import { SandStreamEffect } from './effects/weather/sand-stream-effect';
import { SnowWarningEffect } from './effects/weather/snow-warning-effect';

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
      this.registry.set('ちょすい', new WaterAbsorbEffect());
      this.registry.set('はがねつかい', new SteelworkerEffect());
      this.registry.set('ようりょくそ', new ChlorophyllEffect());
      this.registry.set('すなかき', new SandRushEffect());
      this.registry.set('こんじょう', new KongyouEffect());
      this.registry.set('しんりょく', new ShinryokuEffect());
      this.registry.set('もうか', new MoukaEffect());
      this.registry.set('げきりゅう', new GekiryuuEffect());
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
}
