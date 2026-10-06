import { BattlePokemonMove } from '../entities/battle-pokemon-move.entity';
import { VolatileState } from '../state/volatile-state';
import { MoveFlags } from '@/modules/pokemon/domain/moves/move-flags';
import { MoveBehaviors } from '@/modules/pokemon/domain/moves/move-behaviors';

/**
 * わるあがき（どの制限も受けない。出せる技がないときに出す）
 */
export const STRUGGLE_MOVE_NAME = 'わるあがき';

/**
 * 技を出せない理由
 * - disable: かなしばり
 * - healBlock: かいふくふうじ（回復技）
 * - throatChop: じごくづき（音技）
 * - taunt: ちょうはつ（変化技）
 * - imprison: 相手のふういん（相手が覚えている技）
 * - encore: アンコール（アンコールされた技以外）
 * - torment: いちゃもん（直前に出した技）
 * - choiceLock: こだわり・ごりむちゅう（固定された技以外）
 * - cantUseTwice: デカハンマー・ブラッドムーン（続けて出せない）
 */
export type MoveRestrictionReason =
  | 'disable'
  | 'healBlock'
  | 'throatChop'
  | 'taunt'
  | 'imprison'
  | 'encore'
  | 'torment'
  | 'choiceLock'
  | 'cantUseTwice';

/**
 * 出せるかを判定する技
 */
export interface MoveCandidate {
  readonly moveId: number;
  /** DB の技名（技フラグ・技の性質を引く） */
  readonly moveName: string;
  readonly category: 'Physical' | 'Special' | 'Status';
}

/**
 * 使用者以外から決まる制限
 */
export interface MoveRestrictionOptions {
  /** 相手がふういんを使っているとき、相手が覚えている技の ID */
  readonly imprisonedMoveIds?: readonly number[];
}

/**
 * 技を出せない理由を返す（出せるなら undefined）
 * 判定の順は本家の onBeforeMove の優先度に合わせる（かなしばり → かいふくふうじ・じごくづき → ちょうはつ → ふういん）。
 * アンコール・いちゃもん・こだわりは、本家では技を選ぶ時点で選べない技として扱われる
 * わるあがきはどの制限も受けない
 */
export const findMoveRestriction = (
  user: VolatileState,
  move: MoveCandidate,
  options: MoveRestrictionOptions = {},
): MoveRestrictionReason | undefined => {
  if (move.moveName === STRUGGLE_MOVE_NAME) {
    return undefined;
  }
  if (user.disable?.moveId === move.moveId) {
    return 'disable';
  }
  if (user.healBlockTurns !== undefined && MoveFlags.has(move.moveName, 'heal')) {
    return 'healBlock';
  }
  if (user.throatChopTurns !== undefined && MoveFlags.has(move.moveName, 'sound')) {
    return 'throatChop';
  }
  if (user.tauntTurns !== undefined && move.category === 'Status') {
    return 'taunt';
  }
  if (options.imprisonedMoveIds?.includes(move.moveId)) {
    return 'imprison';
  }
  if (user.encore !== undefined && user.encore.moveId !== move.moveId) {
    return 'encore';
  }
  if (user.torment === true && user.lastMoveId === move.moveId) {
    return 'torment';
  }
  if (user.choiceLockedMoveId !== undefined && user.choiceLockedMoveId !== move.moveId) {
    return 'choiceLock';
  }
  if (user.lastMoveId === move.moveId && MoveBehaviors.has(move.moveName, 'cantUseTwice')) {
    return 'cantUseTwice';
  }
  return undefined;
};

const RESTRICTION_LABELS: Readonly<Record<MoveRestrictionReason, string>> = {
  disable: 'because it is disabled',
  healBlock: 'because of Heal Block',
  throatChop: 'because of Throat Chop',
  taunt: 'after the taunt',
  imprison: 'because of Imprison',
  encore: 'because of Encore',
  torment: 'because of Torment',
  choiceLock: 'because it is locked into another move',
  cantUseTwice: 'twice in a row',
};

/**
 * 技を出せないときのメッセージ（例: "Cannot use つるぎのまい after the taunt"）
 */
export const moveRestrictionMessage = (reason: MoveRestrictionReason, moveName: string): string =>
  `Cannot use ${moveName} ${RESTRICTION_LABELS[reason]}`;

/**
 * プレイヤーの選択にかかわらず出す行動
 * - recharge: はかいこうせんなどの反動で動けない（moveId は反動の技。行動順の優先度に使う）
 * - charging: ため技の 2 ターン目
 * - lockedIn: あばれる・さわぐなど、出し続ける技
 * - encore: アンコールされた技
 */
export type ForcedAction =
  | { readonly kind: 'recharge'; readonly moveId?: number }
  | { readonly kind: 'charging'; readonly moveId: number }
  | { readonly kind: 'lockedIn'; readonly moveId: number }
  | { readonly kind: 'encore'; readonly moveId: number };

/**
 * 選んだ技の代わりに出す行動を返す（なければ undefined）
 * 反動 → ため技の 2 ターン目 → 出し続ける技 → アンコールの順に優先する
 */
export const resolveForcedAction = (state: VolatileState): ForcedAction | undefined => {
  if (state.mustRecharge === true) {
    return { kind: 'recharge', moveId: state.lastMoveId };
  }
  if (state.chargingMoveId !== undefined) {
    return { kind: 'charging', moveId: state.chargingMoveId };
  }
  if (state.lockedInMove !== undefined) {
    return { kind: 'lockedIn', moveId: state.lockedInMove.moveId };
  }
  if (state.encore !== undefined) {
    return { kind: 'encore', moveId: state.encore.moveId };
  }
  return undefined;
};

/**
 * 技の欄 1 つ分（ものまねなどで入れ替わった技を反映したもの）
 */
export interface MoveSlot {
  /** 欄の ID（BattlePokemonMove の ID。入れ替わっていても元の欄の ID） */
  readonly battlePokemonMoveId: number;
  readonly moveId: number;
  readonly currentPp: number;
  readonly maxPp: number;
  /** volatileState.moveSlotOverrides の技なら true（PP は volatileState に書く） */
  readonly isOverride: boolean;
}

/**
 * 覚えている技に、volatileState.moveSlotOverrides の入れ替えを反映した技の欄を返す
 */
export const resolveMoveSlots = (
  moves: readonly BattlePokemonMove[],
  state: VolatileState,
): MoveSlot[] =>
  moves.map(move => {
    const override = state.moveSlotOverrides?.find(o => o.battlePokemonMoveId === move.id);
    return override
      ? {
          battlePokemonMoveId: move.id,
          moveId: override.moveId,
          currentPp: override.currentPp,
          maxPp: override.maxPp,
          isOverride: true,
        }
      : {
          battlePokemonMoveId: move.id,
          moveId: move.moveId,
          currentPp: move.currentPp,
          maxPp: move.maxPp,
          isOverride: false,
        };
  });

/**
 * 技 ID から技の欄を探す（入れ替わる前の技は見つからない）
 */
export const findMoveSlot = (slots: readonly MoveSlot[], moveId: number): MoveSlot | undefined =>
  slots.find(slot => slot.moveId === moveId);
