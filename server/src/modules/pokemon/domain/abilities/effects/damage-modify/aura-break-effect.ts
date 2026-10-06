import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * オーラブレイクの特性名（DB の name）
 * ダークオーラ・フェアリーオーラが、場にこの特性がいるかを判定するのに使う
 */
export const AURA_BREAK_ABILITY_NAME = 'オーラブレイク';

/**
 * オーラブレイク（Aura Break）特性の効果
 * 場のダークオーラ・フェアリーオーラの効果を逆にする（あく・フェアリー技の威力が 3072/4096 倍になる）
 *
 * このクラス自身はフックを持たない。オーラ側の特性が、攻撃側・防御側の特性名に
 * オーラブレイクがあるかを見て倍率を変える（Pokemon Showdown の hasAuraBreak と同じ）
 */
export class AuraBreakEffect implements IAbilityEffect {}
