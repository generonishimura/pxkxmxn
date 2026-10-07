import { BaseEntryHazardMoveEffect } from './base/base-entry-hazard-move-effect';
import { EntryHazard } from '../../battle-events/field-state';

/**
 * まきびし（Spikes）技の効果
 *
 * 相手の陣営にまきびしを 1 層置く（3 層まで。3 層あれば失敗する）。
 * 地面にいるポケモンが出てきたとき、1 層 1/8・2 層 1/6・3 層 1/4 のダメージを与えるのはエンジン
 */
export class SpikesEffect extends BaseEntryHazardMoveEffect {
  protected readonly hazard: EntryHazard = 'spikes';
  protected readonly message = 'Spikes were scattered on the ground all around the opposing team!';
}
