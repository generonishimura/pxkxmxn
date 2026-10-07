import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { findIllusionTarget } from '../../../battle-events/illusion';

/**
 * イリュージョン（Illusion）特性の効果
 * 場に出るとき、手持ちの後ろにいるポケモンに化ける（本家の onBeforeSwitchIn）。
 * 技のダメージを受けると解ける（本家の onDamagingHit）
 *
 * - 化ける先: 同じトレーナーの手持ちを後ろから見て、自分以外の、ひんしでない最初のポケモン（findIllusionTarget）。
 *   そのようなポケモンがいなければ化けない
 * - 化けている間は、へんしん・かわりものが失敗する（transformInto が判定する）
 * - 特性を書き換える・消すと、化けている状態も消える（setAbility・suppressAbility が消す）
 * - みがわりが受けたヒットでは解けない。かたやぶりでも解ける（本家と同じ）
 * - バトル開始時は、どの先発よりも先に化ける（StartBattleUseCase。本家は先発全員の BeforeSwitchIn が先）
 * 注: API はポケモンの名前・見た目を返さないので、化けた先を相手に見せることはできない。
 * 化けている先（illusionStatusId）は応答から外している（docs/battle-state.md の 8 章）
 */
export class IllusionEffect implements IAbilityEffect {
  async onEntry(holder: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    const repository = battleContext?.battleRepository;
    if (!repository) {
      return;
    }
    const statuses = await repository.findBattlePokemonStatusByBattleId(holder.battleId);
    const target = findIllusionTarget(statuses, holder);
    if (target) {
      await repository.patchVolatileState(holder.id, { illusionStatusId: target.id });
    } else if (holder.volatileState.illusionStatusId !== undefined) {
      await repository.patchVolatileState(holder.id, { illusionStatusId: null });
    }
  }

  async onDamagingHit(
    holder: BattlePokemonStatus,
    _attacker: BattlePokemonStatus,
    _hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    const repository = battleContext?.battleRepository;
    if (!repository || holder.volatileState.illusionStatusId === undefined) {
      return null;
    }
    await repository.patchVolatileState(holder.id, { illusionStatusId: null });
    return 'The illusion wore off!';
  }
}
