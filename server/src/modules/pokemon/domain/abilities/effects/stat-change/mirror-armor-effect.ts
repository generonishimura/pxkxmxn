import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * ミラーアーマー（Mirror Armor）特性の効果
 * 相手が起こした能力ランクの低下を受けず、その低下を相手に返す
 *
 * - 自分で起こした低下（インファイトなど）は返さない
 * - 跳ね返された低下は、相手もミラーアーマーでももう一度は返さない
 * - その能力がすでに -6 なら返さない
 * - 相手の技による低下では、使い手のかたやぶりで無視される
 * 処理は applyStatChanges が reflectsStatDrops を見て行う
 */
export class MirrorArmorEffect implements IAbilityEffect {
  readonly reflectsStatDrops = true;
}
