import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { tryApplyVolatile } from '../../battle-events/volatile-infliction';

/**
 * マジックコート（Magic Coat）技の効果
 * このターンの間、はね返せる技（MoveBehaviors の reflectable。でんじは・まきびしなど）を使用者に返す
 *
 * - 自分に volatileState.magicCoat を付ける。ターン終了時にエンジンが消す
 * - はね返す処理（PP は減らない・はね返した技はもう一度はね返さない・隠れているときは返さない）は、
 *   MoveExecutorService が magicCoat を見て行う
 * - すでにマジックコートの状態なら失敗する
 * - 優先度 +4 は DB の値
 */
export class MagicCoatEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const applied = await tryApplyVolatile(
      attacker,
      'magicCoat',
      { magicCoat: true },
      battleContext,
      { source: { kind: 'move', name: 'マジックコート', pokemon: attacker } },
    );
    return applied ? 'shrouded itself with Magic Coat!' : 'But it failed';
  }
}
