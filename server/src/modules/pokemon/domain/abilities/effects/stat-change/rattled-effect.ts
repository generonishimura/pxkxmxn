import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { EffectSource } from '../../../battle-events/effect-source';
import { StatChange, applyStatChanges } from '../../../battle-events/stat-change';
import { joinStatChangeMessages } from '../../../moves/effects/base/base-stat-change-effect';

/**
 * びびり（Rattled）特性の効果
 * むし・ゴースト・あくタイプの技でダメージを受けたとき、または いかく で攻撃が下がったとき、
 * 素早さを1段階上げる
 *
 * - 技はヒットごとに判定する（連続技ではヒットのたびに上がる）。ひんしになったときは上がらない
 * - いかくは、攻撃ランクが実際に変わったときだけ発動する（-6 で下がらなかった・クリアボディなどで防いだときは発動しない）
 * - かたやぶりでは無視されない（本家と同じ）
 */
export class RattledEffect implements IAbilityEffect {
  private static readonly ABILITY_NAME = 'びびり';
  private static readonly TRIGGER_TYPES: readonly string[] = ['むし', 'ゴースト', 'あく'];

  async onDamagingHit(
    holder: BattlePokemonStatus,
    _attacker: BattlePokemonStatus,
    hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext || !RattledEffect.TRIGGER_TYPES.includes(hit.moveTypeName)) {
      return null;
    }
    return this.raiseSpeed(holder, battleContext);
  }

  async onStatChanged(
    holder: BattlePokemonStatus,
    applied: readonly StatChange[],
    source: EffectSource | undefined,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (
      !battleContext ||
      source?.name !== 'いかく' ||
      !applied.some(change => change.statType === 'attack')
    ) {
      return null;
    }
    return this.raiseSpeed(holder, battleContext);
  }

  private async raiseSpeed(
    holder: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (holder.currentHp <= 0) {
      return null;
    }
    const result = await applyStatChanges(
      holder,
      [{ statType: 'speed', rankChange: 1 }],
      battleContext,
      { source: { pokemon: holder, kind: 'ability', name: RattledEffect.ABILITY_NAME } },
    );
    return joinStatChangeMessages(result);
  }
}
