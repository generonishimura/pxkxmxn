import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { IItemEffect } from '../item-effect.interface';

/**
 * きあいのハチマキ（Focus Band）
 * ひんしになる技のダメージを、10% の確率で HP 1 で耐える。使い切らない
 *
 * - 技の追加効果ではないので、てんのめぐみ・りんぷんの影響を受けない（本家と同じ）
 * 注: こんらんの自傷・みらいよちは、エンジンがこのフックを呼ばないので耐えない（本家は耐えることがある）
 */
export class FocusBandEffect implements IItemEffect {
  private static readonly CHANCE = 0.1;

  endureHit(holder: BattlePokemonStatus, damage: number): Promise<string | null> {
    if (damage < holder.currentHp || Math.random() >= FocusBandEffect.CHANCE) {
      return Promise.resolve(null);
    }
    return Promise.resolve('hung on using its きあいのハチマキ!');
  }
}
