import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * カブトアーマー（Battle Armor）特性の効果
 * 相手の技が急所に当たらない（必ず急所になる技・とぎすます・きあいだめでも急所にならない）。
 * シェルアーマー（Shell Armor）も同じ効果なので、このクラスを使う
 *
 * 判定は MoveExecutorService が preventsCriticalHit を見て行う（かたやぶりで無視される。本家の breakable）
 */
export class BattleArmorEffect implements IAbilityEffect {
  readonly preventsCriticalHit = true;
}
