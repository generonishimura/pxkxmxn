import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * プレッシャー（Pressure）特性の効果
 *
 * 相手が自分を対象にする技（と、まきびし・ステルスロックなど mustPressure の技）を出すと、その技の PP が 1 余分に減る
 * 自分が出した技・自分を対象にする技では減らない。かたやぶりでは無視されない（エンジンの MoveLifecycle.consumePp）
 * 注: 出てきたときの「プレッシャーを放っている」の表示はしない（onEntry はメッセージを返せないため）
 * 注: 場全体を対象にする技（あまごい・トリックルームなど）では PP が余分に減らない。本家では減る
 *   （エンジンの MoveLifecycle.consumePp が、相手を対象にする技と mustPressure の技しか見ないため）
 * 注: ゆびをふる・ねごとなどで呼ばれた技が自分を対象にしても、呼んだ技の PP が余分に減らない。本家では減る
 *   （エンジンが呼ばれた技では PP の処理をしないため）
 */
export class PressureEffect implements IAbilityEffect {
  modifyOpponentPpDeduction(): number {
    return 1;
  }
}
