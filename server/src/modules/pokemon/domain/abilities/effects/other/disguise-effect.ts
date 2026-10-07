import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { changeForm } from '../../../battle-events/form-change';
import { applyIndirectDamage } from '../../../battle-events/indirect-damage';
import { fractionOfMaxHp } from '../../../battle-events/heal';
import { isSpecies } from '../base/is-species';

/**
 * ミミッキュの全国図鑑の番号
 */
const MIMIKYU_NATIONAL_DEX = 778;

/**
 * ばけのかわ（Disguise）特性の効果
 * ミミッキュが最初に受ける攻撃技のヒットを 1 回だけ防ぎ（ダメージ 0）、ばれたすがたになる
 *
 * - 防いだら persistentState.disguiseBusted を書き、交代しても戻らない 'busted' のフォルムにする
 * - 防いだあと、自分の最大HPの1/8（切り捨て、最低1）のダメージを受ける（第 8 世代から。本家と同じ）
 * - 防いだヒットは急所にならない。連続技は次のヒットからダメージを受ける（エンジンが判定する）
 * - かたやぶりで無視される・へんしん中は効かない（エンジンと noTransform の判定）。ミミッキュでなければ防がない
 * 注: 本家ではこんらんの自傷も防ぐが、ここでは技のヒットだけを防ぐ（こんらんの自傷は特性のフックを呼ばない）
 */
export class DisguiseEffect implements IAbilityEffect {
  async blockDamagingHit(
    holder: BattlePokemonStatus,
    _attacker: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (
      !battleContext?.battleRepository ||
      holder.persistentState.disguiseBusted === true ||
      holder.volatileState.transformedIntoStatusId !== undefined ||
      !(await isSpecies(holder, MIMIKYU_NATIONAL_DEX, battleContext))
    ) {
      return null;
    }

    await battleContext.battleRepository.patchPersistentState(holder.id, { disguiseBusted: true });
    await changeForm(holder, 'busted', battleContext, { persistent: true });
    const latest =
      (await battleContext.battleRepository.findBattlePokemonStatusById(holder.id)) ?? holder;
    await applyIndirectDamage(latest, fractionOfMaxHp(latest, 8), battleContext);
    return 'Its disguise served it as a decoy!';
  }
}
