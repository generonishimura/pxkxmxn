import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * しめりけで失敗する爆発技（DB の name）
 */
const EXPLOSIVE_MOVE_NAMES: ReadonlySet<string> = new Set([
  'だいばくはつ', // Explosion
  'じばく', // Self-Destruct
  'ビックリヘッド', // Mind Blown
  'ミストバースト', // Misty Explosion
]);

/**
 * しめりけ（Damp）特性の効果
 * 場にいる間、だいばくはつ・じばく・ビックリヘッド・ミストバーストを失敗させる
 *
 * - 相手が使ったときも、自分が使ったときも失敗する（preventsMove の両方の役割で判定する）
 * - 相手のかたやぶりでは無視される（エンジンが防御側の特性を無視する）
 * - 失敗したときは PP だけ減り、使ったポケモンはひんしにならない
 * - ゆうばくのダメージを防ぐ部分は AftermathEffect で判定する
 */
export class DampEffect implements IAbilityEffect {
  preventsMove(
    _holder: BattlePokemonStatus,
    _role: 'attacker' | 'defender',
    battleContext?: BattleContext,
  ): boolean {
    return EXPLOSIVE_MOVE_NAMES.has(battleContext?.moveName ?? '');
  }
}
