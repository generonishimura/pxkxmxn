import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * エアロック（Air Lock）特性の効果
 * 場にいる間、天候の効果をなくす（天候そのものは残る）。ノーてんきと同じ効果
 *
 * エンジンが suppressesWeather を見て、技の実行・行動順・ターン終了時の天候を「天候なし」として扱う。
 * かたやぶりでは無視されない（本家と同じ）
 *
 * 注: 場に出たときの「天候の効果がなくなった」というメッセージは出さない
 */
export class AirLockEffect implements IAbilityEffect {
  readonly suppressesWeather = true;
}
