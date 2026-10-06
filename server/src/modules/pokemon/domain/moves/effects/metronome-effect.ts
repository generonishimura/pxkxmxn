import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { MoveBehaviors } from '../move-behaviors';

/**
 * ゆびをふる（Metronome）技の効果
 *
 * ゆびをふるで出る技（MoveBehaviors の metronome）から等しい確率で一つを選び、callMove で出す。
 * 第 9 世代と同じく、自分が覚えている技も選ばれる。出た技の PP は減らない（エンジン）
 * 注: 選んだ技が DB にないと、callMove が失敗を返す
 */
export class MetronomeEffect implements IMoveEffect {
  async onUse(
    _attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const candidates = MoveBehaviors.namesWith('metronome');
    if (!battleContext.callMove || candidates.length === 0) {
      return 'But it failed';
    }
    const moveName = candidates[Math.floor(Math.random() * candidates.length)];
    return battleContext.callMove({ moveName, calledBy: 'ゆびをふる' });
  }
}
