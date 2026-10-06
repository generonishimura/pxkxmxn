import { BaseMoveFlagImmunityEffect } from '../base/base-move-flag-immunity-effect';

/**
 * ぼうおん（Soundproof）特性の効果
 * 相手の音技（ハイパーボイス・なきごえ・うたう など）を無効にする。変化技も無効にする。
 * かたやぶりで無視される。
 * 場全体の技（ほろびのうた）ではエンジンが isImmuneToMove を呼ばないため、ほろびのうたの効果が自分で呼んで防ぐ。
 */
export class SoundproofEffect extends BaseMoveFlagImmunityEffect {
  protected readonly immuneFlag = 'sound';
}
