import { MoveBehaviors } from '@/modules/pokemon/domain/moves/move-behaviors';
import type { IMoveEffect } from '@/modules/pokemon/domain/moves/move-effect.interface';
import type { StatType } from '@/modules/pokemon/domain/moves/effects/base/base-stat-change-effect';
import { StatusCondition } from '../entities/status-condition.enum';
import { ProtectionKind } from '../state/volatile-state';
import { SideConditions, SideGuardKind } from '../state/side-state';

/**
 * まもる系を続けて使ったときの成功率の分母の上限（本家の stall の counterMax）
 */
export const PROTECT_COUNTER_MAX = 729;

/**
 * まもる系を続けて使ったときの成功率の分母の倍率
 */
const PROTECT_COUNTER_MULTIPLIER = 3;

/**
 * 相手の技を防いだ守り（こらえるは防がないので入らない）
 */
export type BlockingGuard = Exclude<ProtectionKind, 'endure'> | SideGuardKind;

/**
 * 守りを判定する相手の技
 */
export interface ProtectionIncomingMove {
  /** 技名（MoveBehaviors の noProtect・spread を引く） */
  readonly moveName: string;
  /** 技の分類 */
  readonly category: 'Physical' | 'Special' | 'Status';
  /** いたずらごころなどを反映した優先度（ファストガード） */
  readonly effectivePriority: number;
  /** 使用者の特性でまもる系を通り抜ける（ふかしのこぶしの接触技） */
  readonly bypassesProtect?: boolean;
}

/**
 * 接触した相手への守りの効果
 * - stat: 相手の能力ランクを下げる（キングシールド・ブロッキング・スレッドトラップ）
 * - damage: 相手の最大 HP の 1/divisor のダメージ（ニードルガード）
 * - status: 相手を状態異常にする（トーチカ・かえんのまもり）
 */
export type ProtectionContactEffect =
  | { readonly type: 'stat'; readonly statType: StatType; readonly rankChange: number }
  | { readonly type: 'damage'; readonly divisor: number }
  | { readonly type: 'status'; readonly status: StatusCondition };

/**
 * 守りの技名（メッセージ・効果の付与元の名前に使う）
 */
export const GUARD_MOVE_NAMES: Readonly<Record<BlockingGuard | 'endure', string>> = {
  protect: 'まもる',
  kingsShield: 'キングシールド',
  spikyShield: 'ニードルガード',
  banefulBunker: 'トーチカ',
  obstruct: 'ブロッキング',
  silkTrap: 'スレッドトラップ',
  burningBulwark: 'かえんのまもり',
  endure: 'こらえる',
  wideGuard: 'ワイドガード',
  quickGuard: 'ファストガード',
  craftyShield: 'トリックガード',
  matBlock: 'たたみがえし',
};

/**
 * 接触した相手への効果（第9世代。キングシールドは攻撃 -1）
 */
export const PROTECTION_CONTACT_EFFECTS: Readonly<
  Partial<Record<BlockingGuard, ProtectionContactEffect>>
> = {
  kingsShield: { type: 'stat', statType: 'attack', rankChange: -1 },
  obstruct: { type: 'stat', statType: 'defense', rankChange: -2 },
  silkTrap: { type: 'stat', statType: 'speed', rankChange: -1 },
  spikyShield: { type: 'damage', divisor: 8 },
  banefulBunker: { type: 'status', status: StatusCondition.Poison },
  burningBulwark: { type: 'status', status: StatusCondition.Burn },
};

/**
 * 変化技を通す守り（本家の checkMoveBypassesProtect の blockStatus = false）
 */
const ATTACK_ONLY_PROTECTIONS: ReadonlySet<ProtectionKind> = new Set<ProtectionKind>([
  'kingsShield',
  'obstruct',
  'silkTrap',
  'burningBulwark',
]);

/**
 * まもる系を続けて count 回成功させたあとの成功率（1、1/3、1/9、…、最低 1/729）
 */
export const protectSuccessChance = (count: number): number =>
  1 / Math.min(PROTECT_COUNTER_MULTIPLIER ** Math.max(0, count), PROTECT_COUNTER_MAX);

/**
 * 出したあとも、まもる系を続けた回数（protectCount）を残す技か
 * 自分を守る技（こらえるを含む）・ワイドガード・ファストガードと、isProtectionMove の技。
 * トリックガード・たたみがえしは残さない（本家の stall を足さない）
 */
export const keepsProtectCount = (
  moveEffect: Pick<IMoveEffect, 'protection' | 'isProtectionMove'> | undefined,
): boolean => {
  if (moveEffect?.isProtectionMove === true || moveEffect?.protection?.kind !== undefined) {
    return true;
  }
  const side = moveEffect?.protection?.side;
  return side === 'wideGuard' || side === 'quickGuard';
};

/**
 * 相手を対象にする技を、防御側の守りが防ぐかを判定する（本家の onTryHit の順）
 * 1. ファストガード（優先度 1 以上の技）・ワイドガード（spread の技）
 * 2. 自分を守る技（キングシールド・ブロッキング・スレッドトラップ・かえんのまもりは変化技を通す）
 * 3. トリックガード（変化技。まもるで防げない技も防ぐ）・たたみがえし（攻撃技）
 * まもるで防げない技（MoveBehaviors の noProtect）と bypassesProtect の技は、トリックガード以外を通る
 * @returns 防いだ守り。防がなければ undefined
 */
export const findBlockingGuard = (params: {
  readonly protection?: ProtectionKind;
  readonly side: SideConditions;
  readonly move: ProtectionIncomingMove;
}): BlockingGuard | undefined => {
  const { protection, side, move } = params;
  const protectable =
    !MoveBehaviors.has(move.moveName, 'noProtect') && move.bypassesProtect !== true;
  if (side.quickGuard === true && protectable && move.effectivePriority > 0) {
    return 'quickGuard';
  }
  if (side.wideGuard === true && protectable && MoveBehaviors.has(move.moveName, 'spread')) {
    return 'wideGuard';
  }
  if (
    protection !== undefined &&
    protection !== 'endure' &&
    protectable &&
    !(move.category === 'Status' && ATTACK_ONLY_PROTECTIONS.has(protection))
  ) {
    return protection;
  }
  if (side.craftyShield === true && move.category === 'Status') {
    return 'craftyShield';
  }
  if (side.matBlock === true && protectable && move.category !== 'Status') {
    return 'matBlock';
  }
  return undefined;
};

/**
 * 守りが張られているか（フェイントなどで解く対象があるか）
 */
export const hasBreakableProtection = (
  protection: ProtectionKind | undefined,
  side: SideConditions,
): boolean =>
  (protection !== undefined && protection !== 'endure') ||
  side.wideGuard === true ||
  side.quickGuard === true ||
  side.craftyShield === true ||
  side.matBlock === true;
