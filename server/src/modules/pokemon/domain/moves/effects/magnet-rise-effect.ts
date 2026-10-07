import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { tryApplyVolatile } from '../../battle-events/volatile-infliction';
import { moveEffectSource } from './base/base-stat-change-effect';

/** でんじふゆうのターン数（本家の duration） */
const MAGNET_RISE_TURNS = 5;

/**
 * でんじふゆう（Magnet Rise）技の効果
 *
 * 使用者が 5 ターン宙に浮き、じめん技が当たらなくなる（magnetRiseTurns）。
 * - すでに浮いていれば失敗する
 * - ねをはるで根を張っていれば失敗する（本家の onTry）
 * - じめん技を無効にするのはエンジン（DamageCalculator）
 *
 * 注: 本家では、うちおとす・サウザンアローで落とされている間も失敗する。落とされた状態がまだないので判定しない
 * 注: 本家では、じゅうりょくの間は出せない。MoveBehaviors の gravity を見る仕組みがまだないので判定しない
 */
export class MagnetRiseEffect implements IMoveEffect {
  shouldFail(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    _battleContext: BattleContext,
  ): boolean {
    const state = attacker.volatileState;
    return state.magnetRiseTurns !== undefined || state.ingrain === true;
  }

  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const applied = await tryApplyVolatile(
      attacker,
      'magnetRise',
      { magnetRiseTurns: MAGNET_RISE_TURNS },
      battleContext,
      { source: moveEffectSource(attacker, battleContext) },
    );
    return applied ? 'levitated with electromagnetism!' : 'but it failed';
  }
}
