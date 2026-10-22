import { BaseCopyTargetAbilityEffect } from './base/base-copy-target-ability-effect';

/**
 * なりきり（Role Play）技の効果
 *
 * 使用者の特性を、相手の今の特性にする。写した特性は始まる（写したいかくが発動する）。
 * 相手と同じ特性・相手の特性が写せない特性（failRolePlay）・使用者の特性が消せない特性なら失敗する。
 * まもる系で防がれず、みがわりを貫通する（技の性質の表）
 */
export class RolePlayEffect extends BaseCopyTargetAbilityEffect {}
