import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { resolveCurrentAbilityName, setAbility } from '../../../battle-events/ability-change';
import { hasAbilityFlag } from '@/modules/battle/domain/logic/ability-flags';

const WANDERING_SPIRIT_ABILITY_NAME = 'さまようたましい';

/**
 * さまようたましい（Wandering Spirit）特性の効果
 * 接触技を受けたとき、攻撃してきた相手と特性を入れ替える
 *
 * - 相手の今の特性が入れ替えられない特性（failSkillSwap）なら何もしない
 * - 本家と同じく、先に相手の特性をさまようたましいにし（setAbility）、成功したら自分に相手のもとの特性を書く。
 *   そのため、相手が消せない特性（cantSuppress。うのミサイル）なら何もしない
 * - 自分がひんしになったヒットでは、相手だけがさまようたましいになり、自分の特性は変わらない（本家の setAbility は
 *   ひんしのポケモンに失敗する）
 * - 受け取った特性の onEntry は setAbility が呼ぶ（受け取ったいかくが発動する）
 * - かたやぶりでは無視されない（本家と同じ）
 * 注: docs/battle-engine-hooks.md 14.13 の swapAbilities ではなく、本家の Wandering Spirit と同じく setAbility を 2 回使う
 */
export class WanderingSpiritEffect implements IAbilityEffect {
  async onDamagingHit(
    holder: BattlePokemonStatus,
    attacker: BattlePokemonStatus,
    hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext || !hit.isContact) {
      return null;
    }
    const attackerAbilityName = await resolveCurrentAbilityName(attacker, battleContext);
    if (!attackerAbilityName || hasAbilityFlag(attackerAbilityName, 'failSkillSwap')) {
      return null;
    }
    const attackerResult = await setAbility(attacker, WANDERING_SPIRIT_ABILITY_NAME, battleContext);
    if (!attackerResult.changed) {
      return null;
    }
    await setAbility(holder, attackerAbilityName, battleContext);
    return `${WANDERING_SPIRIT_ABILITY_NAME} swapped abilities with the attacker!`;
  }
}
