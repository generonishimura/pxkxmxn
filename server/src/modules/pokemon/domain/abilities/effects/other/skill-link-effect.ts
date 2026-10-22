import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';

/**
 * スキルリンク（Skill Link）特性の効果
 * 連続技が必ず最大回数当たる（2〜5回攻撃の技は5回）
 *
 * 注: 本家ではトリプルキック・トリプルアクセル・ネズミざんのヒットごとの命中判定もなくなるが、
 * これらの技は連続技として登録されていないため、この部分は効果がない
 */
export class SkillLinkEffect implements IAbilityEffect {
  modifyMultiHitCount(_pokemon: BattlePokemonStatus, _minHits: number, maxHits: number): number {
    return maxHits;
  }
}
