import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * おうごんのからだ（Good as Gold）特性の効果
 * 相手が使う変化技を無効にする
 *
 * - isImmuneToMove は相手を対象にする技だけで呼ばれるため、自分や場を対象にする変化技
 *   （つるぎのまい、まきびし、あまごいなど）は無効にしない（本家と同じ）
 * - 命中判定の前に無効にする。相手のかたやぶりでは無視される
 */
export class GoodAsGoldEffect implements IAbilityEffect {
  isImmuneToMove(_pokemon: BattlePokemonStatus, battleContext?: BattleContext): boolean {
    return battleContext?.moveCategory === 'Status';
  }
}
