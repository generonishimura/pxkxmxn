import type { BattleContext } from '../abilities/battle-context.interface';
import { MOVE_FLAG_TABLE } from './move-flag-table';

/**
 * 技の静的なフラグ
 * - contact: 接触技
 * - punch: パンチ技（てつのこぶし）
 * - bite: かみつき技（がんじょうあご）
 * - sound: 音技（ぼうおん、パンクロック、うるおいボイス）
 * - pulse: 波動技（メガランチャー）
 * - ballistic: 弾の技（ぼうだん。Showdown の bullet フラグ）
 * - slicing: 切る技（きれあじ）
 * - wind: 風技（かぜのり、ふうりょくでんき）
 * - powder: 粉の技（ぼうじん）
 * - heal: 回復技（ヒーリングシフト。吸収技を含む）
 */
export type MoveFlag =
  | 'contact'
  | 'punch'
  | 'bite'
  | 'sound'
  | 'pulse'
  | 'ballistic'
  | 'slicing'
  | 'wind'
  | 'powder'
  | 'heal';

const EMPTY_FLAGS: ReadonlySet<MoveFlag> = new Set<MoveFlag>();

const FLAGS_BY_MOVE_NAME: ReadonlyMap<string, ReadonlySet<MoveFlag>> = new Map(
  MOVE_FLAG_TABLE.map(([moveName, flags]) => [moveName, new Set<MoveFlag>(flags)]),
);

/**
 * 技名から静的な技フラグを引くドメインの表
 * 表の中身は move-flag-table.ts にある
 */
export class MoveFlags {
  /**
   * 技名に対応するフラグの集合を返す（表にない技は空集合）
   * @param moveName DB の技名（日本語）
   */
  static get(moveName: string): ReadonlySet<MoveFlag> {
    return FLAGS_BY_MOVE_NAME.get(moveName) ?? EMPTY_FLAGS;
  }

  /**
   * 技が指定のフラグを持つかどうか
   */
  static has(moveName: string, flag: MoveFlag): boolean {
    return MoveFlags.get(moveName).has(flag);
  }
}

/**
 * このヒットが接触技かどうかを判定する
 * battleContext.moveFlags がある場合は contact フラグ（えんかく等の補正後）で判定する。
 * moveFlags がない場合（特性単体のテストなど）は物理技を接触技とみなす。
 */
export const isContactMove = (battleContext?: BattleContext): boolean => {
  if (!battleContext) {
    return false;
  }
  if (battleContext.moveFlags) {
    return battleContext.moveFlags.has('contact');
  }
  return battleContext.moveCategory === 'Physical';
};
