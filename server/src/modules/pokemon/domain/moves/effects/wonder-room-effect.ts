import { BaseRoomMoveEffect } from './base/base-room-move-effect';

/**
 * ワンダールーム（Wonder Room）技の効果
 *
 * 5 ターンの間、場のポケモンの防御と特防の実数値（ランク補正の前）が入れ替わる。ランクは入れ替わらない。
 * ワンダールームの間に使うと、ワンダールームが終わる。入れ替えと終わりはエンジンが行う
 */
export class WonderRoomEffect extends BaseRoomMoveEffect {
  protected readonly key = 'wonderRoomTurns';
  protected readonly startMessage =
    'It created a bizarre area in which Defense and Sp. Def stats are swapped!';
  protected readonly endMessage =
    'Wonder Room wore off, and Defense and Sp. Def stats returned to normal!';
}
