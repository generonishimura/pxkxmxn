import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * てんこがすめつぼうのひかり（Light That Burns the Sky）技の効果
 *
 * 使用者の攻撃が特攻より高ければ物理技になる（DB の分類は特殊）。
 * 比べる能力はランク込みで、特性・持ち物の補正は掛けない（本家の onModifyMove の getStat(stat, false, true)）。
 * 同じ値なら特殊技のまま
 *
 * 注: 本家は相手の特性を無視する（ignoreAbility）。このエンジンには技で相手の特性を無視する仕組みがないので、無視しない
 */
export class LightThatBurnsTheSkyEffect implements IMoveEffect {
  modifyMoveCategory(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): 'Physical' | 'Special' | undefined {
    const stats = battleContext.attackerStats;
    if (!stats) {
      return undefined;
    }
    const attack = Math.floor(stats.attack * attacker.getStatMultiplier('attack'));
    const specialAttack = Math.floor(
      stats.specialAttack * attacker.getStatMultiplier('specialAttack'),
    );
    return attack > specialAttack ? 'Physical' : 'Special';
  }
}
