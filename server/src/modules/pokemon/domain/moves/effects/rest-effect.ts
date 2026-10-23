import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { StatusConditionHandler } from '@/modules/battle/domain/logic/status-condition-handler';
import { isEffectivelyAsleep } from '../../battle-events/effective-status';
import { isUproarActive } from '../../battle-events/status-infliction';
import { getAbilityEffect, resolveAbilityName } from '../../battle-events/ability-lookup';
import { isStatusPreventedByTerrain } from '../../battle-events/field-protection';
import { resolveTypeNames } from '../../battle-events/battle-traits';

/**
 * ねむる（Rest）技の効果
 *
 * 効果: 自分の HP を全回復し、自分自身を眠り状態にする（チャンピオンズでは3ターン。SV は2ターン）
 *
 * 次のときは失敗する（HP も回復しない。本家と同じ）
 * - すでにねむっている（ぜったいねむりを含む）
 * - HP が満タン
 * - 自分の特性がねむりを防ぐ（ふみん・やるき・晴れのリーフガードなど。canReceiveStatusCondition）
 * - 場の誰かがさわいでいる
 * - 地面にいて、エレキフィールド・ミストフィールドの上にいる（isStatusPreventedByTerrain）
 *
 * ほかの状態異常（やけど・まひなど）があるときは、ねむりに上書きする（本家と同じ）
 *
 * 眠るターン数は固定で、persistentState.sleepTurns に残りを書く。BeforeMoveChecker が技を出そうとするたびに減らし、
 * 0 になった次の行動で起こす。通常のねむりのような確率での解除はしない（StatusConditionProcessorService は sleepTurns があるねむりを飛ばす）
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
      return 'But it failed';
    }

    // HP が満タンなら失敗
    if (attacker.currentHp >= attacker.maxHp) {
      return 'But it failed';
    }

    // ねむりになれない（特性・さわぐ・フィールド）なら失敗
    if (!(await canFallAsleep(attacker, battleContext))) {
      return 'But it failed';
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
      currentHp: attacker.maxHp,
      statusCondition: StatusCondition.Sleep,
    });
    await battleContext.battleRepository.patchPersistentState(attacker.id, {
      sleepTurns: StatusConditionHandler.REST_SLEEP_TURNS,
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
  const abilityName = await resolveAbilityName(pokemon, battleContext);
  const typeNames = await resolveTypeNames(pokemon, battleContext);
  if (
    isStatusPreventedByTerrain(
      pokemon,
      StatusCondition.Sleep,
      typeNames,
      abilityName,
      battleContext,
    )
  ) {
    return false;
  }
  const ability = await getAbilityEffect(abilityName);
  return (
    ability?.canReceiveStatusCondition?.(pokemon, StatusCondition.Sleep, battleContext, {
      kind: 'move',
      pokemon,
      name: 'ねむる',
    }) !== false
  );
};
