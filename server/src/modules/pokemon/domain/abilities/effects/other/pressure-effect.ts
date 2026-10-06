import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * プレッシャー（Pressure）特性の効果
 *
 * 相手が自分を対象にする技（と、まきびし・ステルスロックなど mustPressure の技）を出すと、その技の PP が 1 余分に減る
 * 自分が出した技・自分を対象にする技では減らない。かたやぶりでは無視されない（エンジンの MoveLifecycle.consumePp）
 * 注: 出てきたときの「プレッシャーを放っている」の表示はしない（onEntry はメッセージを返せないため）
 */
export class PressureEffect implements IAbilityEffect {
  modifyOpponentPpDeduction(): number {
    return 1;
  }
}
