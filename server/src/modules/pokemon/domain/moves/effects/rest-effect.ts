import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { isEffectivelyAsleep } from '../../battle-events/effective-status';
import { isUproarActive } from '../../battle-events/status-infliction';
import { getAbilityEffect, resolveAbilityName } from '../../battle-events/ability-lookup';

/**
 * ねむる（Rest）技の効果
 *
 * 効果: 自分の HP を全回復し、自分自身を眠り状態にする（本家では2ターン）
 *
 * 次のときは失敗する（HP も回復しない。本家と同じ）
 * - すでにねむっている（ぜったいねむりを含む）
 * - HP が満タン
 * - 自分の特性がねむりを防ぐ（ふみん・やるき・晴れのリーフガードなど。canReceiveStatusCondition）
 * - 場の誰かがさわいでいる
 *
 * ほかの状態異常（やけど・まひなど）があるときは、ねむりに上書きする（本家と同じ）
 *
 * 注: 本家では「2ターン固定で眠る」が、現状の engine では状態異常のターン経過管理が
 *     未整備のため、眠り状態の付与のみを行う（眠りの起床処理は engine 側の責務）
 * 注: エレキフィールド・ミストフィールドでねむりにならない処理は、状態異常の付与全体で
 *     まだ扱っていないため、ここでも失敗しない
 */
export class RestEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    // すでにねむっている（ぜったいねむりを含む）なら失敗
    if (isEffectivelyAsleep(attacker, battleContext)) {
      return null;
    }

    // HP が満タンなら失敗
    if (attacker.currentHp >= attacker.maxHp) {
      return null;
    }

    // ねむりになれない（特性・さわぐ）なら失敗
    if (!(await canFallAsleep(attacker, battleContext))) {
      return null;
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
      currentHp: attacker.maxHp,
      statusCondition: StatusCondition.Sleep,
    });

    return 'user slept and recovered HP!';
  }
}

/**
 * 自分をねむりにできるか（ほかの状態異常があっても上書きするので、canInflictStatus は使わない）
 * 自分で自分に付与するので、かたやぶりは関係しない
 */
const canFallAsleep = async (
  pokemon: BattlePokemonStatus,
  battleContext: BattleContext,
): Promise<boolean> => {
  if (await isUproarActive(pokemon, battleContext)) {
    return false;
  }
  const ability = await getAbilityEffect(await resolveAbilityName(pokemon, battleContext));
  return (
    ability?.canReceiveStatusCondition?.(pokemon, StatusCondition.Sleep, battleContext, {
      kind: 'move',
      pokemon,
      name: 'ねむる',
    }) !== false
  );
};
