import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../../battle-context.interface';
import { EffectSource } from '../../../battle-events/effect-source';
import { tryInflictStatus } from '../../../battle-events/status-infliction';

/**
 * シンクロでうつし返す状態異常（ねむり・こおり・ひるみ・こんらんはうつさない）
 */
const SYNCHRONIZED_STATUSES: readonly StatusCondition[] = [
  StatusCondition.Burn,
  StatusCondition.Paralysis,
  StatusCondition.Poison,
  StatusCondition.BadPoison,
];

/**
 * シンクロ（Synchronize）特性の効果
 * 相手にやけど・まひ・どく・もうどくにされたとき、相手も同じ状態異常にする
 *
 * - 技・特性のどちらで付与されても発動する（inflictStatus で付与されたとき）。自分で付与したとき（かえんだまなど）は発動しない
 * - どくびしでどく・もうどくになったときは発動しない（本家と同じ。どくびしは、しんぴのまもりで防げるよう相手を source にしている）
 * - サイコシフトでうつされたときは、相手がまだ状態異常なのでうつし返せない（本家と同じ）
 * - 注: せいでんきなど接触時の特性で状態異常にされたときも相手を状態異常にするが、バトルログには「<特性名> activated!」しか出ず、シンクロのメッセージは出ない
 * - 相手がタイプ・特性で防げる場合や、すでに状態異常の場合は、相手は状態異常にならない
 * - 相手もシンクロでも、自分はすでに状態異常なので返し合いにならない
 */
export class SynchronizeEffect implements IAbilityEffect {
  async onStatusInflicted(
    holder: BattlePokemonStatus,
    statusCondition: StatusCondition,
    source: EffectSource | undefined,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext?.battleRepository || !source?.pokemon) {
      return null;
    }
    if (source.pokemon.id === holder.id || !SYNCHRONIZED_STATUSES.includes(statusCondition)) {
      return null;
    }
    if (source.kind === 'other' && source.name === 'どくびし') {
      return null;
    }

    const latestSource =
      (await battleContext.battleRepository.findBattlePokemonStatusById(source.pokemon.id)) ??
      source.pokemon;
    const { inflicted, messages } = await tryInflictStatus(
      latestSource,
      statusCondition,
      battleContext,
      { source: { pokemon: holder, kind: 'ability', name: 'シンクロ' } },
    );
    return inflicted ? ['Synchronize activated!', ...messages].join(' ') : null;
  }
}
