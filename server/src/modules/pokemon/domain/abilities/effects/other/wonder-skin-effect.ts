import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * ミラクルスキンで変化技の命中率を置き換える値（本家の onModifyAccuracy）
 */
const WONDER_SKIN_ACCURACY = 50;

/**
 * ミラクルスキン（Wonder Skin）特性の効果
 * 自分が受ける変化技の命中率を 50 にする
 *
 * - 命中率が数値の変化技だけが対象。命中率が null の技（必ず当たる技）は変えない
 * - ランク補正・じゅうりょくの前の命中率を置き換える（AccuracyCalculator が modifyBaseAccuracy を呼ぶ）
 * - 攻撃技と、自分が使う変化技には効かない
 * - かたやぶり・きんしのちからで無視される（エンジンが防御側の modifyBaseAccuracy を呼ばない）
 */
export class WonderSkinEffect implements IAbilityEffect {
  modifyBaseAccuracy(
    _holder: BattlePokemonStatus,
    role: 'attacker' | 'defender',
    _accuracy: number,
    battleContext?: BattleContext,
  ): number | undefined {
    return role === 'defender' && battleContext?.moveCategory === 'Status'
      ? WONDER_SKIN_ACCURACY
      : undefined;
  }
}
