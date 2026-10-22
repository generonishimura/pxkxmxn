import { BaseEntryHazardMoveEffect } from './base/base-entry-hazard-move-effect';
import { EntryHazard } from '../../battle-events/field-state';

/**
 * どくびし（Toxic Spikes）技の効果
 *
 * 相手の陣営にどくびしを 1 層置く（2 層まで。2 層あれば失敗する）。
 * 地面にいるポケモンが出てきたとき、1 層ならどく・2 層ならもうどくにするのと、
 * 地面にいるどくタイプが出てきたら消すのはエンジン
 */
export class ToxicSpikesEffect extends BaseEntryHazardMoveEffect {
  protected readonly hazard: EntryHazard = 'toxicSpikes';
  protected readonly message =
    'Poison spikes were scattered on the ground all around the opposing team!';
}
