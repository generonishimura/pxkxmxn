import { BaseEntryHazardMoveEffect } from './base/base-entry-hazard-move-effect';
import { EntryHazard } from '../../battle-events/field-state';

/**
 * ステルスロック（Stealth Rock）技の効果
 *
 * 相手の陣営にステルスロックを置く（すでにあれば失敗する）。
 * ポケモンが出てきたとき、最大 HP × いわの相性 / 8 のダメージを与えるのはエンジン（浮いていても受ける）
 */
export class StealthRockEffect extends BaseEntryHazardMoveEffect {
  protected readonly hazard: EntryHazard = 'stealthRock';
  protected readonly message = 'Pointed stones float in the air around the opposing team!';
}
