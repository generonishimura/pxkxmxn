import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';
import { setWeather } from '../../../battle-events/field-state';

/**
 * すなはき（Sand Spit）特性の効果
 * 攻撃技のダメージを受けるたびに、天候をすなあらしにする
 *
 * - 自分がひんしになったヒットでも発動する（本家と同じ）
 * - すでにすなあらし・ゲンシ天候なら何もしない。連続技の前のヒットで変えた天候も見るため、setWeather が
 *   バトルを取り直して判定する。残りターン数 5 を書く
 * - かたやぶりでは無視されない（本家と同じ）
 * 注: 書き換えた天候は、その技の残りのヒット・同じターンの相手の技・ターン終了時の処理には反映されない
 *     （エンジンがターンの初めに読んだバトルの天候を使い続けるため）。次のターンから反映される
 */
export class SandSpitEffect implements IAbilityEffect {
  async onDamagingHit(
    _holder: BattlePokemonStatus,
    _attacker: BattlePokemonStatus,
    _hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext) {
      return null;
    }
    // 最新のバトルで判定する（すでにすなあらし・ゲンシ天候の間は何もしない）
    return (await setWeather(battleContext, Weather.Sandstorm)) ? 'A sandstorm kicked up!' : null;
  }
}
