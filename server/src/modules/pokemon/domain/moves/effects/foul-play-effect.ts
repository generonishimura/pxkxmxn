import { AttackStatOverride, IMoveEffect } from '../move-effect.interface';

/**
 * イカサマ（Foul Play）技の効果
 *
 * 自分の攻撃ではなく、相手の攻撃の実数値と攻撃ランクでダメージを計算する。
 * やけどの半減は、技を使った自分がやけどのときに掛かる。
 *
 * 相手がてんねんのときは、相手の攻撃ランクを無視する（本家と同じ。てんねんは「技を使う側」のランクを
 * 無視するため、イカサマが参照する相手自身の攻撃ランクも無視される）。
 * 自分がてんねんのときは、相手の攻撃ランクをそのまま使う（本家と同じ）。
 *
 * 根拠（Pokémon Showdown）: getDamage はイカサマで攻撃の参照先を相手にし、
 * `attacker.calculateStat('atk', boosts, 1, source)` で ModifyBoost イベントを「技を使う側（source）」で起こす。
 * てんねんの onAnyModifyBoost は、技を使う側が activePokemon で、てんねんの持ち主が activeTarget のとき
 * atk を 0 にする。そのため、相手（activeTarget）のてんねんは、イカサマが参照する相手自身の攻撃ランクも 0 にする。
 */
export class FoulPlayEffect implements IMoveEffect {
  readonly attackStatOverride: AttackStatOverride = { source: 'defender', stat: 'attack' };
}
