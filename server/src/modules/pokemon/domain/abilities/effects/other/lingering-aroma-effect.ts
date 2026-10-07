import { BaseContactAbilityOverwriteEffect } from '../base/base-contact-ability-overwrite-effect';

/**
 * とれないにおい（Lingering Aroma）特性の効果
 * 接触技を受けたとき、攻撃してきた相手の特性をとれないにおいにする
 *
 * - 相手がすでにとれないにおい・消せない特性（cantSuppress）なら何もしない
 * - 自分がひんしになったヒットでも発動する
 * 処理は BaseContactAbilityOverwriteEffect が行う
 * 注: 書き換える前の相手の特性の終わり（本家の End）は呼ばない（setAbility の近似）
 */
export class LingeringAromaEffect extends BaseContactAbilityOverwriteEffect {
  protected readonly abilityName = 'とれないにおい';
}
