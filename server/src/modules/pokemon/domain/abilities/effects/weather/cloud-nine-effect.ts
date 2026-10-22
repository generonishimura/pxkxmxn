import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * ノーてんき（Cloud Nine）特性の効果
 *
 * 場にいる間、天候の効果をなくす（天候そのものは残る）。
 * 自分と相手のどちらにも効き、技の実行・行動順・ターン終了時の天候を「天候なし」として扱う。
 *
 * 注: 場に出たときの「天候の影響がなくなった」というメッセージは出さない。
 */
export class CloudNineEffect implements IAbilityEffect {
  readonly suppressesWeather = true;
}
