import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { getSideConditions } from '@/modules/battle/domain/state/side-state';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 回復するまでのターン数。使ったターンの終わりに 1 減り、次のターンの終わりに回復する（本家の duration: 2）
 */
const WISH_TURNS = 2;

/**
 * ねがいごと（Wish）技の効果
 *
 * 自分の陣営にねがいごとを置く（sideState の wish に turns: 2 と回復量を書く）。
 * 次のターンの終わりに、エンジンがその陣営の場のポケモンを回復する（交代していれば、交代先が回復する）。
 * - 回復量は、使ったポケモンの最大HPの半分（切り捨て）
 * - 自分の陣営にねがいごとが残っているあいだは失敗する
 * - かいふくふうじ中は回復しない（エンジンの applyHeal が防ぐ）
 */
export class WishEffect implements IMoveEffect {
  shouldFail(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): boolean {
    return getSideConditions(battleContext.battle.sideState, attacker.trainerId).wish !== undefined;
  }

  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }
    await battleContext.battleRepository.patchSideConditions(
      battleContext.battle.id,
      attacker.trainerId,
      { wish: { turns: WISH_TURNS, healAmount: Math.floor(attacker.maxHp / 2) } },
    );
    return 'made a wish!';
  }
}
