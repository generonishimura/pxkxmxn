import { Weather } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../abilities/battle-context.interface';
import type { IAbilityEffect } from '../abilities/ability-effect.interface';
import { getAbilityEffect } from './ability-lookup';
import { resolveBattleAbilityName } from './battle-traits';

/**
 * 変わった場の状態の種類（天候・フィールド）
 */
export type FieldChangeKind = 'weather' | 'terrain';

/**
 * 天候・フィールドが変わったことを、場のひんしでないポケモンの特性（onWeatherChange / onTerrainChange）に知らせる
 * setWeather・setPrimalWeather・setTerrain が変えたあとと、エンジンが天候・フィールド・ゲンシ天候を終わらせたあとに呼ぶ。
 * 技・特性の実装から直接呼ぶ必要はない（場の状態を書く補助関数が呼ぶ）
 *
 * - 特性は実効の特性（いえき・かがくへんかガスで消えていれば呼ばない）
 * - コンテキストの battle は読み直した最新のもの、weather は効果のある天候（ノーてんき・エアロックが場にいれば None）
 * 注: 本家は素早さの順に呼ぶが、ここでは ID の順に呼ぶ
 */
export const notifyFieldChange = async (
  battleContext: BattleContext,
  kind: FieldChangeKind,
): Promise<void> => {
  const repository = battleContext.battleRepository;
  if (!repository) {
    return;
  }
  const battle = (await repository.findById(battleContext.battle.id)) ?? battleContext.battle;
  const actives = ((await repository.findBattlePokemonStatusByBattleId(battle.id)) ?? [])
    .filter(status => status.isActive && status.currentHp > 0)
    .sort((a, b) => a.id - b.id);
  const holders: Array<{ id: number; effect: IAbilityEffect | undefined }> = [];
  for (const status of actives) {
    const abilityName = await resolveBattleAbilityName(status, battleContext);
    holders.push({ id: status.id, effect: await getAbilityEffect(abilityName) });
  }
  const weatherSuppressed = holders.some(holder => holder.effect?.suppressesWeather === true);
  const weather =
    battle.weather === null ? null : weatherSuppressed ? Weather.None : battle.weather;
  const context: BattleContext = { ...battleContext, battle, weather, field: battle.field };
  for (const { id, effect } of holders) {
    const hook = kind === 'weather' ? effect?.onWeatherChange : effect?.onTerrainChange;
    const latest = hook ? await repository.findBattlePokemonStatusById(id) : null;
    if (effect && hook && latest && latest.currentHp > 0) {
      await hook.call(effect, latest, context);
    }
  }
};
