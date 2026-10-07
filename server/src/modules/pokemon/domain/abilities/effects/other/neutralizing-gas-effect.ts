import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * かがくへんかガス（Neutralizing Gas）特性の効果
 * 場にいる間、ほかの場のポケモンの特性を効かなくする
 *
 * - 判定はエンジンが実効の特性を求めるときに行う（resolveEffectiveAbilityName。docs/battle-engine-hooks.md 14.5）。
 *   ここではフックを持たず、実装済みの特性として登録するだけ
 * - 消せない特性（cantSuppress）とかがくへんかガス自身は消えない。ひんし・いえき・へんしん中なら効かない
 * - バトル開始時は、かがくへんかガスの先発の onEntry を先に呼ぶ（エンジン）
 * 注: かがくへんかガスが場を離れたとき、ほかのポケモンの特性の onEntry を呼び直さない（本家は呼び直すので、いかくが発動する）
 * 注: 場に出たときのメッセージは出さない（onEntry はメッセージを返せない）
 */
export class NeutralizingGasEffect implements IAbilityEffect {}
