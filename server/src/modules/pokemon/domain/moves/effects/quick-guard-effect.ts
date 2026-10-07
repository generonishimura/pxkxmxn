import { IMoveEffect } from '../move-effect.interface';

/**
 * ファストガード（Quick Guard）技の効果
 *
 * 効果: そのターン、自分の陣営を優先度 1 以上の技（いたずらごころで上がった変化技も）から守る
 *       続けて使っても成功率は下がらないが、protectCount は 1 増える（あとに使うまもるの成功率が下がる）
 *       成功の判定・陣営の守りの書き込みはエンジンが行う
 * 注: シングルバトルでは味方がいないので、守るのは自分だけ
 */
export class QuickGuardEffect implements IMoveEffect {
  readonly protection = { side: 'quickGuard' } as const;
}
