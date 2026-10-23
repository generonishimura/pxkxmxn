import { LevitateEffect } from './levitate-effect';
import { BeastBoostEffect } from '../stat-change/beast-boost-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * Eelevate 特性の効果（メガシビルドン）
 * - ふゆうと同じく、じめん技を受けない。地面にいないので、まきびし・どくびし・ねばねばネットも受けない
 *   （grounded.ts の AIRBORNE_ABILITY_NAMES に入れている）
 * - ビーストブーストと同じく、自分の技で相手をひんしにしたら、実数値が最も高い能力を 1 段階上げる
 * 本家（Pokemon Showdown）の Pokemon#isGrounded と onSourceAfterFaint（getBestStat）と同じ
 *
 * 注: 日本語名が DB にないため、英語名の Eelevate で登録する
 */
export class EelevateEffect extends LevitateEffect {
  private readonly knockOutBoost = new BeastBoostEffect('Eelevate');

  onKnockOut(
    holder: BattlePokemonStatus,
    fainted: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    return this.knockOutBoost.onKnockOut(holder, fainted, battleContext);
  }
}
