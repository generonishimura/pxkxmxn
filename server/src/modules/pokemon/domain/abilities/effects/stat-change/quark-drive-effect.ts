import { BaseHighestStatBoostEffect } from '../base/base-highest-stat-boost-effect';
import { BattleContext } from '../../battle-context.interface';
import { Field } from '@/modules/battle/domain/entities/battle.entity';

/**
 * クォークチャージ（Quark Drive）特性の効果
 * エレキフィールドの間、一番高い能力が上がる（攻撃・防御・特攻・特防は 5325/4096 倍、素早さは 1.5 倍）
 *
 * 注: ブーストエナジーで発動する効果は、持ち物の仕組みがないため未対応
 * 注: 補正のかけ方の近似は BaseHighestStatBoostEffect を参照
 */
export class QuarkDriveEffect extends BaseHighestStatBoostEffect {
  protected isActive(battleContext: BattleContext): boolean {
    const field = battleContext.field ?? battleContext.battle?.field ?? null;
    return field === Field.ElectricTerrain;
  }
}
