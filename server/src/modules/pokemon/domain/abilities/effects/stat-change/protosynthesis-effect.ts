import { BaseHighestStatBoostEffect } from '../base/base-highest-stat-boost-effect';
import { BattleContext } from '../../battle-context.interface';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';
import { getContextWeather } from '../../context-weather';

/**
 * こだいかっせい（Protosynthesis）特性の効果
 * はれの間、一番高い能力が上がる（攻撃・防御・特攻・特防は 5325/4096 倍、素早さは 1.5 倍）
 * 天候は効果のある天候で判定する（ノーてんき・エアロックがいれば発動しない）
 *
 * 注: ブーストエナジーで発動する効果は、持ち物の仕組みがないため未対応
 * 注: 補正のかけ方の近似は BaseHighestStatBoostEffect を参照
 */
export class ProtosynthesisEffect extends BaseHighestStatBoostEffect {
  protected isActive(battleContext: BattleContext): boolean {
    return getContextWeather(battleContext) === Weather.Sun;
  }
}
