import { BaseRoomMoveEffect } from './base/base-room-move-effect';

/**
 * トリックルーム（Trick Room）技の効果
 *
 * 5 ターンの間、同じ優先度の技は素早さの遅いポケモンから出す。
 * トリックルームの間に使うと、トリックルームが終わる。行動順を変えるのと終わりはエンジンが行う
 */
export class TrickRoomEffect extends BaseRoomMoveEffect {
  protected readonly key = 'trickRoomTurns';
  protected readonly startMessage = 'The dimensions were twisted!';
  protected readonly endMessage = 'The twisted dimensions returned to normal!';
}
