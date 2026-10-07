import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * ききかいひ（Emergency Exit）・にげごし（Wimp Out）特性の効果
 * HP が最大 HP の半分より上から半分以下（ひんしを除く）になったとき、控えと交代する
 *
 * - 相手の攻撃技のダメージ（技のあと）・設置技・ターン終了時のダメージで発動する（switchesOutBelowHalfHp。エンジンが判定する）
 * - 控えがいなければ発動しない。発動したら、相手のとんぼがえりなどの交代は起きない
 * - ドラゴンテール・ともえなげで交代させられるときは、強制交代が先に決まり発動しない
 * - かたやぶりでは無視されない
 * 注: 本家は、ちからずくの使い手の追加効果のある技では発動しないが、ここでは発動する
 * 注: 交代先をプレイヤーが選ぶ API はまだないので、控えの先頭が出る
 */
export class EmergencyExitEffect implements IAbilityEffect {
  readonly switchesOutBelowHalfHp = true;
}
