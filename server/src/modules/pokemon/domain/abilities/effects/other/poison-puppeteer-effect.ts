import { IAbilityEffect } from '../../ability-effect.interface';
import { BattleContext } from '../../battle-context.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { tryInflictStatus } from '../../../battle-events/status-infliction';

/**
 * どくくぐつ（Poison Puppeteer）特性の効果
 * 相手をどく・もうどくにしたとき、その相手をこんらんさせる（onInflictStatus）。
 * こんらんは状態異常と同時に持てる。マイペースの相手・すでにこんらんしている相手には効かない
 *
 * 本家はモモワロウのときだけ発動する。へんしん・かわりもので写した特性では発動しない
 * （どくくぐつはなりきり・スキルスワップ・トレースなどで写せないので、ほかの持ち主はへんしんだけ）
 *
 * 注: 本家は技でどくにしたときだけ発動する。onInflictStatus には付与の原因が渡らないので、
 *     付与元がこの特性のポケモンなら発動する（モモワロウが技以外でどくにする手段はないので、結果は同じ）
 */
export class PoisonPuppeteerEffect implements IAbilityEffect {
  async onInflictStatus(
    holder: BattlePokemonStatus,
    target: BattlePokemonStatus,
    statusCondition: StatusCondition,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (
      !battleContext ||
      holder.volatileState.transformedIntoStatusId !== undefined ||
      (statusCondition !== StatusCondition.Poison && statusCondition !== StatusCondition.BadPoison)
    ) {
      return null;
    }
    const { inflicted, messages } = await tryInflictStatus(
      target,
      StatusCondition.Confusion,
      battleContext,
      { source: { pokemon: holder, kind: 'ability', name: 'どくくぐつ' } },
    );
    return inflicted ? ['became confused!', ...messages].join(' ') : null;
  }
}
