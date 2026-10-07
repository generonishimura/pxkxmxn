import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { resolveCurrentAbilityName, setAbility } from '../../../battle-events/ability-change';

/**
 * 接触技を受けたとき、攻撃してきた相手の特性を自分の特性に書き換える特性の基底クラス（ミイラ・とれないにおい）
 *
 * - 接触したヒット（hit.isContact）ごとに、onDamagingHit で setAbility(attacker, 自分の特性名) を呼ぶ
 * - 相手の今の特性がすでに同じ特性・消せない特性（cantSuppress）なら何もしない（本家と同じ）
 * - 自分がひんしになったヒットでも発動する（本家の DamagingHit と同じ）
 * - かたやぶりでは無視されない（本家と同じ）
 */
export abstract class BaseContactAbilityOverwriteEffect implements IAbilityEffect {
  /**
   * 相手に写す特性名（この特性自身の名前）
   */
  protected abstract readonly abilityName: string;

  async onDamagingHit(
    _holder: BattlePokemonStatus,
    attacker: BattlePokemonStatus,
    hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext || !hit.isContact) {
      return null;
    }
    if ((await resolveCurrentAbilityName(attacker, battleContext)) === this.abilityName) {
      return null;
    }
    // 消せない特性（cantSuppress）は setAbility が書き換えない
    const { changed } = await setAbility(attacker, this.abilityName, battleContext);
    return changed ? `The attacker's ability became ${this.abilityName}!` : null;
  }
}
