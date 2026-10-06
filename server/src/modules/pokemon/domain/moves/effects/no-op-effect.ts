import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 「何も起こらない」変化技の特殊効果実装
 *
 * 使用例: はねる、おいわい、てをつなぐ
 * 効果: 何もしない（メッセージのみ）
 *
 * ダブルバトル専用の技（シングルバトルでは対象がいないか、意味がない）:
 * - サイドチェンジ（Ally Switch）: 味方と場所を入れ替える
 * - てだすけ（Helping Hand）: 味方の技の威力を上げる
 * - コーチング（Coaching）: 味方の攻撃と防御を上げる
 * - アロマミスト（Aromatic Mist）: 味方の特防を上げる
 * - ドラゴンエール（Dragon Cheer）: 味方の急所率を上げる
 * - このゆびとまれ（Follow Me）/ いかりのこな（Rage Powder）/ スポットライト（Spotlight）:
 *   相手の技を自分（または対象）に引き寄せる
 * - おさきにどうぞ（After You）/ さきおくり（Quash）: 対象の行動順を変える
 * 注: 実機のシングルバトルでは多くが「うまく決まらなかった」と失敗するが、
 *     ここでは共通の「何も起こらない」メッセージで代用する。
 *
 * 仕組み: `MoveRegistry` のカバレッジチェックを満たすために、変化技として
 *         登録される必要がある「何もしない」技用の共通実装。
 *         単一の stateless インスタンスを複数の技名にエイリアス登録できる。
 */
export class NoOpEffect implements IMoveEffect {
  async onUse(
    _attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    _battleContext: BattleContext,
  ): Promise<string | null> {
    return 'But nothing happened!';
  }
}
