import { IMoveEffect } from './move-effect.interface';
import { FlamethrowerEffect } from './effects/flamethrower-effect';
import { ThunderboltEffect } from './effects/thunderbolt-effect';
import { ToxicEffect } from './effects/toxic-effect';
import { IceBeamEffect } from './effects/ice-beam-effect';
import { SleepPowderEffect } from './effects/sleep-powder-effect';

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
   */
  static initialize(): void {
    // 技の特殊効果ロジックを登録
    // DBのnameをキーとして、対応するロジッククラスを登録
    this.registry.set('かえんほうしゃ', new FlamethrowerEffect());
    this.registry.set('10まんボルト', new ThunderboltEffect());
    this.registry.set('どくどく', new ToxicEffect());
    this.registry.set('れいとうビーム', new IceBeamEffect());
    this.registry.set('ねむりごな', new SleepPowderEffect());
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
}

