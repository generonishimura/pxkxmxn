import { BaseEntryHazardMoveEffect } from './base/base-entry-hazard-move-effect';
import { EntryHazard } from '../../battle-events/field-state';

/**
 * ねばねばネット（Sticky Web）技の効果
 *
 * 相手の陣営にねばねばネットを置く（すでにあれば失敗する）。
 * 地面にいるポケモンが出てきたとき、素早さを 1 段階下げるのはエンジン
 */
export class StickyWebEffect extends BaseEntryHazardMoveEffect {
  protected readonly hazard: EntryHazard = 'stickyWeb';
  protected readonly message =
    'A sticky web has been laid out on the ground around the opposing team!';
}
