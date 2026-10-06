import { BaseMoveFlagImmunityEffect } from '../base/base-move-flag-immunity-effect';

/**
 * ぼうおん（Soundproof）特性の効果
 * 相手の音技（ハイパーボイス・なきごえ・うたう など）を無効にする。変化技も無効にする。
 * かたやぶりで無視される。
 * 注: 場全体の技（ほろびのうた）は isImmuneToMove が呼ばれないため防げない（本家は防ぐ）。
 */
export class SoundproofEffect extends BaseMoveFlagImmunityEffect {
  protected readonly immuneFlag = 'sound';
}
