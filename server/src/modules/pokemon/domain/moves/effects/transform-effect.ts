import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { transformInto } from '../../battle-events/transform';

/**
 * へんしん（Transform）技の効果
 * 相手の姿を写す（本家の onHit の transformInto）。
 * タイプ・HP 以外の実数値・特性・能力ランク・技（各 5 PP）・きあいだめ・とぎすますを写し、交代で元に戻る
 *
 * - どちらかがひんし・どちらかがへんしん中・相手がみがわり中・どちらかがイリュージョンで化けているなら失敗する
 * - まもる系を無視する（noProtect の表）。必中は DB の命中で扱う
 * 注: 重さ・性別は写さない（transformInto の注）
 */
export class TransformEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    return (await transformInto(attacker, defender, battleContext))
      ? 'transformed!'
      : 'But it failed';
  }
}
