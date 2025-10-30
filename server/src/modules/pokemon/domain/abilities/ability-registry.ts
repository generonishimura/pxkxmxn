import { IAbilityEffect } from './ability-effect.interface';
import { IntimidateEffect } from './effects/intimidate-effect';
import { MultiscaleEffect } from './effects/multiscale-effect';

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
   */
  static initialize(): void {
    // 特性ロジックを登録
    // DBのnameをキーとして、対応するロジッククラスを登録
    this.registry.set('いかく', new IntimidateEffect());
    this.registry.set('マルチスケイル', new MultiscaleEffect());
    // 将来的に他の特性も追加可能:
    // this.registry.set('ふみん', new InsomniaEffect());
    // this.registry.set('ふゆう', new LevitateEffect());
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
}
