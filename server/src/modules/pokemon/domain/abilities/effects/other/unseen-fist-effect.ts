import { IAbilityEffect } from '../../ability-effect.interface';
import { BattleContext } from '../../battle-context.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { isContactMove } from '@/modules/pokemon/domain/moves/move-flags';

/**
 * ふかしのこぶし（Unseen Fist）特性の効果
 * 自分の接触技が、相手のまもる系（まもる・ニードルガード・キングシールド・たたみがえし・ファストガードなど）を
 * 通り抜ける。通り抜けたときは、ニードルガードのダメージなど接触したときの守りの効果も受けない
 *
 * 変化技を防ぐトリックガードは通り抜けない（本家と同じ。変化技で接触する技はない）
 */
export class UnseenFistEffect implements IAbilityEffect {
  bypassesProtection(_holder: BattlePokemonStatus, battleContext?: BattleContext): boolean {
    return isContactMove(battleContext);
  }
}
