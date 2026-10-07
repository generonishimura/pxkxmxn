import { IMoveEffect } from '../move-effect.interface';

/**
 * ワイドガード（Wide Guard）技の効果
 *
 * 効果: そのターン、自分の陣営を相手全体・自分以外全体の技（じしん・なみのり・なきごえなど）から守る
 *       続けて使っても成功率は下がらないが、protectCount は 1 増える（あとに使うまもるの成功率が下がる）
 *       成功の判定・陣営の守りの書き込みはエンジンが行う
 * 注: シングルバトルでは味方がいないので、守るのは自分だけ
 */
export class WideGuardEffect implements IMoveEffect {
  readonly protection = { side: 'wideGuard' } as const;
}
