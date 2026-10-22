import { BaseCopyTargetAbilityEffect } from './base/base-copy-target-ability-effect';

/**
 * うつしえ（Doodle）技の効果
 *
 * 使用者の特性を、相手の今の特性にする。写した特性は始まる。
 * 相手の特性が写せない特性（failRolePlay）・相手と同じ特性・使用者の特性が消せない特性なら失敗する。
 * まもる系で防がれない（技の性質の表）が、みがわりには防がれる
 * 注: 本家は味方の特性も書き換えるが、シングルバトルでは味方がいないので使用者だけを書き換える
 */
export class DoodleEffect extends BaseCopyTargetAbilityEffect {}
