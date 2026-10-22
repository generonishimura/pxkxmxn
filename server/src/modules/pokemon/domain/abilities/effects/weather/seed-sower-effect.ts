import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Field } from '@/modules/battle/domain/entities/battle.entity';
import { setTerrain } from '../../../battle-events/field-state';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';

/**
 * こぼれダネ（Seed Sower）特性の効果
 * 相手の技でダメージを受けたヒットのたびに、グラスフィールドにする
 *
 * - すでにグラスフィールドなら何もしない。別のフィールドなら書き換える
 * - ひんしになったヒットでも発動する。かたやぶりでは無視されない（本家と同じ）
 * 注: 張ったグラスフィールドは、その技の残りのヒット・同じターンの相手の技・ターン終了時の処理には反映されない
 *    （エンジンがターンの初めに読んだバトルのフィールドを使い続けるため）。次のターンから反映される
 */
export class SeedSowerEffect implements IAbilityEffect {
  async onDamagingHit(
    _holder: BattlePokemonStatus,
    _attacker: BattlePokemonStatus,
    _hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext) {
      return null;
    }
    // 連続技の前のヒットで張っていることがあるため、setTerrain が最新のバトルの状態で判定する
    return (await setTerrain(battleContext, Field.GrassyTerrain))
      ? 'Grassy Terrain was set up!'
      : null;
  }
}
