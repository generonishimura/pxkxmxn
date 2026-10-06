import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';

/**
 * 能力ランクの変化・状態異常の付与を起こしたもの
 * 特性のフック（canReceiveStatChange・onStatusInflicted など）が「誰が・何で」起こしたかを判定するのに使う
 */
export interface EffectSource {
  /**
   * 起こしたポケモン。自分で起こした変化（つるぎのまいなど）は対象と同じポケモン
   */
  readonly pokemon?: BattlePokemonStatus;

  /**
   * 起こしたポケモンの特性名。わかっていれば渡す（かたやぶり・ふしょくの判定に使う。なければ引き直す）
   */
  readonly abilityName?: string;

  /**
   * 原因の種類。'move' のときだけ、相手の特性がかたやぶりで無視される
   */
  readonly kind: 'move' | 'ability' | 'other';

  /**
   * 原因の技名・特性名（例: 'いかく'、'シンクロ'）
   */
  readonly name?: string;
}
