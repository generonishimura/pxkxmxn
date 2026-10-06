import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Field } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';

/**
 * こぼれダネ（Seed Sower）特性の効果
 * 相手の技でダメージを受けたヒットのたびに、グラスフィールドにする
 *
 * - すでにグラスフィールドなら何もしない。別のフィールドなら書き換える
 * - ひんしになったヒットでも発動する。かたやぶりでは無視されない（本家と同じ）
 * 注: 連続技の2回目以降のヒットのダメージ計算には、張ったグラスフィールドが反映されない
 *    （エンジンが技の開始時のフィールドで計算するため）
 */
export class SeedSowerEffect implements IAbilityEffect {
  async onDamagingHit(
    _holder: BattlePokemonStatus,
    _attacker: BattlePokemonStatus,
    _hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext?.battleRepository) {
      return null;
    }

    // 連続技の前のヒットで張っていることがあるため、最新のバトルの状態で判定する
    const battle =
      (await battleContext.battleRepository.findById(battleContext.battle.id)) ??
      battleContext.battle;
    if (battle.field === Field.GrassyTerrain) {
      return null;
    }

    await battleContext.battleRepository.update(battle.id, { field: Field.GrassyTerrain });
    return 'Grassy Terrain was set up!';
  }
}
