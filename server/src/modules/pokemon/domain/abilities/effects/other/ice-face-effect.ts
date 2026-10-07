import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';
import { changeForm } from '../../../battle-events/form-change';
import { getContextWeather } from '../../context-weather';
import { getAbilityEffect } from '../../../battle-events/ability-lookup';
import { resolveBattleAbilityName } from '../../../battle-events/battle-traits';
import { isSpecies } from '../base/is-species';

/**
 * コオリッポの全国図鑑の番号
 */
const EISCUE_NATIONAL_DEX = 875;

/**
 * アイスフェイス（Ice Face）特性の効果
 * コオリッポがアイスフェイスのとき、物理技のヒットを 1 回だけ防ぎ（ダメージ 0）、ナイスフェイスになる
 *
 * - 防いだら persistentState.iceFaceBroken を書き、交代しても戻らない 'noice' のフォルムにする
 *   （防御・特防が下がり、素早さが上がる。タイプと実数値はエンジンがフォルムの表で求める）
 * - 特殊技は防がない。防いだヒットは急所にならない（エンジンが判定する）
 * - あられ（ゆき）になったとき（onWeatherChange）と、あられの場に出たとき（onEntry）に、アイスフェイスに戻る。
 *   場のノーてんき・エアロックで天候が消えているときは戻らない（本家の field.isWeather と同じ）
 * - かたやぶりで無視される・へんしん中は効かない（エンジンと noTransform の判定）。コオリッポでなければ何もしない
 * 注: この実装では、ゆきの代わりにあられ（Weather.Hail）で戻る
 */
export class IceFaceEffect implements IAbilityEffect {
  async blockDamagingHit(
    holder: BattlePokemonStatus,
    _attacker: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (
      !battleContext?.battleRepository ||
      battleContext.moveCategory !== 'Physical' ||
      holder.persistentState.iceFaceBroken === true ||
      holder.volatileState.transformedIntoStatusId !== undefined ||
      !(await isSpecies(holder, EISCUE_NATIONAL_DEX, battleContext))
    ) {
      return null;
    }

    await battleContext.battleRepository.patchPersistentState(holder.id, { iceFaceBroken: true });
    await changeForm(holder, 'noice', battleContext, { persistent: true });
    return 'Its Ice Face shielded it!';
  }

  async onWeatherChange(holder: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    await this.restoreInHail(holder, battleContext);
  }

  async onEntry(holder: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    await this.restoreInHail(holder, battleContext);
  }

  /**
   * あられのとき、ナイスフェイスならアイスフェイスに戻す（本家の onStart・onWeatherChange）
   */
  private async restoreInHail(
    holder: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<void> {
    if (
      !battleContext?.battleRepository ||
      holder.currentHp <= 0 ||
      holder.persistentState.iceFaceBroken !== true ||
      (await this.effectiveWeather(battleContext)) !== Weather.Hail ||
      !(await isSpecies(holder, EISCUE_NATIONAL_DEX, battleContext))
    ) {
      return;
    }
    await battleContext.battleRepository.patchPersistentState(holder.id, { iceFaceBroken: null });
    await changeForm(holder, null, battleContext, { persistent: true });
  }

  /**
   * 効果のある天候を求める
   * onWeatherChange のコンテキストにはエンジンが効果のある天候を入れるので、それを使う。
   * onEntry のコンテキストには入らないので、notifyFieldChange と同じく、場のひんしでないポケモンの
   * 実効の特性に suppressesWeather（ノーてんき・エアロック）がいれば天候なしとして扱う
   */
  private async effectiveWeather(battleContext: BattleContext): Promise<Weather | null> {
    const weather = getContextWeather(battleContext);
    const repository = battleContext.battleRepository;
    if (
      battleContext.weather !== undefined ||
      weather === null ||
      weather === Weather.None ||
      !repository
    ) {
      return weather;
    }
    const actives = (
      (await repository.findBattlePokemonStatusByBattleId(battleContext.battle.id)) ?? []
    ).filter(status => status.isActive && status.currentHp > 0);
    for (const status of actives) {
      const abilityName = await resolveBattleAbilityName(status, battleContext);
      if ((await getAbilityEffect(abilityName))?.suppressesWeather === true) {
        return Weather.None;
      }
    }
    return weather;
  }
}
