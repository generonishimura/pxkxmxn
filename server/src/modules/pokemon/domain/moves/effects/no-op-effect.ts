import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 「何も起こらない」変化技の特殊効果実装
 *
 * 使用例: はねる、おいわい、てをつなぐ
 * 効果: 何もしない（メッセージのみ）
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
