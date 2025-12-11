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
