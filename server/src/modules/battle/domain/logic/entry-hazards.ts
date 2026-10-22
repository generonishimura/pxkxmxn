import { HealingWishKind } from '../state/side-state';

/**
 * 設置技（ステルスロック・まきびし・どくびし・ねばねばネット）と、いやしのねがい・みかづきのまいの
 * 場に出たときの計算（本家の Gen 9 と同じ値・丸め）
 * 書き込みは PokemonSwitcherService（EntryHazardProcessor）が行う
 */

/**
 * まきびしの層ごとのダメージ（最大 HP の n/24。本家の damageAmounts = [0, 3, 4, 6]）
 */
const SPIKES_DAMAGE_NUMERATORS: readonly number[] = [0, 3, 4, 6];
const SPIKES_DAMAGE_DENOMINATOR = 24;

/**
 * ステルスロックのダメージ（最大 HP × いわの相性 / 8。切り捨て、最低 1）
 * @param effectiveness いわタイプの、場に出たポケモンへの相性（0.25〜4）
 */
export const stealthRockDamage = (maxHp: number, effectiveness: number): number =>
  Math.max(1, Math.floor((maxHp * effectiveness) / 8));

/**
 * まきびしのダメージ（1 層 1/8、2 層 1/6、3 層 1/4。切り捨て、最低 1）
 */
export const spikesDamage = (maxHp: number, layers: number): number =>
  Math.max(
    1,
    Math.floor((maxHp * (SPIKES_DAMAGE_NUMERATORS[layers] ?? 0)) / SPIKES_DAMAGE_DENOMINATOR),
  );

/**
 * どくびしを踏んだ結果
 * - poison / badPoison: どく（1 層）・もうどく（2 層）にする（付与できるかは canInflictStatus で判定する）
 * - absorb: 地面にいるどくタイプがどくびしを消す
 * - none: 地面にいないので何もしない
 */
export type ToxicSpikesOutcome = 'poison' | 'badPoison' | 'absorb' | 'none';

export const toxicSpikesOutcome = (
  layers: number,
  target: { readonly grounded: boolean; readonly typeNames: readonly string[] },
): ToxicSpikesOutcome => {
  if (!target.grounded) {
    return 'none';
  }
  if (target.typeNames.includes('どく')) {
    return 'absorb';
  }
  return layers >= 2 ? 'badPoison' : 'poison';
};

/**
 * いやしのねがい・みかづきのまいで、場に出たポケモンを回復するか
 * 第 8 世代からは、回復するところがないポケモンが出てきたときは使わずに残す
 * （みかづきのまいは PP が減っているときも回復する）
 */
export const shouldHealOnEntry = (
  kind: HealingWishKind,
  target: { readonly hpFull: boolean; readonly hasStatus: boolean; readonly ppFull?: boolean },
): boolean =>
  !target.hpFull || target.hasStatus || (kind === 'lunarDance' && target.ppFull === false);
