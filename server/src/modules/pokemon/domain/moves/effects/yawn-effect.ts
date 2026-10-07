import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { tryApplyVolatile } from '../../battle-events/volatile-infliction';
import { moveEffectSource } from './base/base-stat-change-effect';

/**
 * 眠るまでのターン数。使ったターンの終わりに 1 減り、次のターンの終わりに眠る（本家の duration: 2）
 */
const YAWN_TURNS = 2;

/**
 * あくび（Yawn）技の効果
 *
 * 相手をねむけ状態にする（volatileState.yawnTurns に 2 を書く）。次のターンの終わりに、
 * エンジンがねむりにする（その時点で眠れなければ眠らない）。
 * - 相手が状態異常、ねむりを防ぐ特性（ふみん・やるき・スイートベールなど）、すでにねむけ状態なら失敗する
 * - ねむりを防ぐ特性は、使い手のかたやぶりで無視される
 * - みがわり・マジックコートなどはエンジンが判定する
 *
 * 注: エレキフィールド・ミストフィールド・しんぴのまもりでは本家は失敗するが、
 *     エンジンがフィールドとしんぴのまもりによる状態異常の防止を扱わないため、ここでも防がない
 */
export class YawnEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const applied = await tryApplyVolatile(
      defender,
      'yawn',
      { yawnTurns: YAWN_TURNS },
      battleContext,
      { source: moveEffectSource(attacker, battleContext) },
    );
    return applied ? 'made the target drowsy!' : 'But it failed';
  }
}
