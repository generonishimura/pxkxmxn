import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * すなはき（Sand Spit）特性の効果
 * 攻撃技のダメージを受けるたびに、天候をすなあらしにする
 *
 * - 自分がひんしになったヒットでも発動する（本家と同じ）
 * - すでにすなあらしなら何もしない。連続技の前のヒットで変えた天候も見るため、バトルを取り直して判定する
 * - かたやぶりでは無視されない（本家と同じ）
 */
export class SandSpitEffect implements IAbilityEffect {
  async onDamagingHit(
    _holder: BattlePokemonStatus,
    _attacker: BattlePokemonStatus,
    _hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext?.battleRepository) {
      return null;
    }

    const battle =
      (await battleContext.battleRepository.findById(battleContext.battle.id)) ??
      battleContext.battle;
    if (battle.weather === Weather.Sandstorm) {
      return null;
    }

    await battleContext.battleRepository.update(battle.id, { weather: Weather.Sandstorm });
    return 'A sandstorm kicked up!';
  }
}
