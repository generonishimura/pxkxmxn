import { BaseGlobalFieldConditionMoveEffect } from './base/base-global-field-condition-move-effect';

/**
 * どろあそび（Mud Sport）技の効果
 *
 * 5 ターンの間（使ったターンを含む）、場のすべてのでんき技の威力を 1352/4096 倍にする。
 * 威力の補正はエンジン（fieldBasePowerModifiers）が行う。すでにどろあそびの状態なら失敗する
 * 注: 本家の第 9 世代では使えない技なので、第 6〜8 世代と同じ効果で実装する
 */
export class MudSportEffect extends BaseGlobalFieldConditionMoveEffect {
  protected readonly key = 'mudSportTurns';
  protected readonly turns = 5;
  protected readonly message = "Electricity's power was weakened!";
}
