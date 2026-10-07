import { Field } from '@/modules/battle/domain/entities/battle.entity';
import { BaseTerrainMoveEffect } from './base/base-terrain-move-effect';

/**
 * サイコフィールド（Psychic Terrain）技の効果
 *
 * 5 ターンの間、地面にいるポケモンのエスパー技の威力が 1.3 倍になり、地面にいるポケモンは優先度の高い技を受けない。
 * フィールドの効果と終わりはエンジンが行う。すでにサイコフィールドなら何もしない
 */
export class PsychicTerrainEffect extends BaseTerrainMoveEffect {
  protected readonly field = Field.PsychicTerrain;
  protected readonly message = 'Psychic Terrain was set up!';
}
