import { IAbilityEffect } from '../ability-effect.interface';

/**
 * 「いかく」特性の効果実装
 *
 * 効果: 場に出すとき、相手の攻撃ランクを1段階下げる
 */
export class IntimidateEffect implements IAbilityEffect {
  /**
   * 場に出すときに発動
   * 相手の攻撃ランクを1段階下げる
   */
  onEntry(pokemon: any, battleContext?: any): void {
    // TODO: 実際のバトル実装時は、バトルコンテキストから相手ポケモンを取得し、
    // ステータスランクを操作するロジックを実装する
    
    // 現在は学習目的のため、インターフェースの実装例を示すのみ
    console.log(`[IntimidateEffect] ${pokemon.name} のいかくが発動！相手の攻撃が下がった！`);
  }

  // いかくは場に出すときのみ発動するため、他のメソッドは実装不要
}

