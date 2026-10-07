import { Field } from '@/modules/battle/domain/entities/battle.entity';
import { BaseTerrainMoveEffect } from './base/base-terrain-move-effect';

/**
 * エレキフィールド（Electric Terrain）技の効果
 *
 * 5 ターンの間、地面にいるポケモンのでんき技の威力が 1.3 倍になり、地面にいるポケモンは眠らない。
 * フィールドの効果と終わりはエンジンが行う。すでにエレキフィールドなら何もしない
 */
export class ElectricTerrainEffect extends BaseTerrainMoveEffect {
  protected readonly field = Field.ElectricTerrain;
  protected readonly message = 'Electric Terrain was set up!';
}
