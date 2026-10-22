import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * フラワーギフト（Flower Gift）特性の効果
 * 晴れのとき、こうげきととくぼうを 1.5 倍にする
 *
 * 注: こうげき・とくぼうの上昇は、晴れのとき物理技で与えるダメージを 1.5 倍、
 *     特殊技で受けるダメージを 1/1.5 倍にすることで表現する。
 *     味方への効果（ダブルバトル専用）と、チェリムのフォルムチェンジ（見た目のみ）は扱わない
 */
export class FlowerGiftEffect implements IAbilityEffect {
  private static readonly STAT_BOOST = 1.5;

  /**
   * ダメージを与えるときに発動
   * 晴れのとき、物理技のダメージを 1.5 倍にする
   */
  modifyDamageDealt(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (!FlowerGiftEffect.isSunny(battleContext) || battleContext?.moveCategory !== 'Physical') {
      return undefined;
    }
    return Math.floor(damage * FlowerGiftEffect.STAT_BOOST);
  }

  /**
   * ダメージを受けるときに発動
   * 晴れのとき、特殊技のダメージを 1/1.5 倍にする
   */
  modifyDamage(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number {
    if (!FlowerGiftEffect.isSunny(battleContext) || battleContext?.moveCategory !== 'Special') {
      return damage;
    }
    return Math.floor(damage / FlowerGiftEffect.STAT_BOOST);
  }

  /**
   * 天候が晴れかどうか（battleContext.weather が優先、なければ battle.weather を使用）
   */
  private static isSunny(battleContext?: BattleContext): boolean {
    const weather = battleContext?.weather ?? battleContext?.battle?.weather ?? null;
    return weather === Weather.Sun;
  }
}
