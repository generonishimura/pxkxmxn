import { Field } from '@/modules/battle/domain/entities/battle.entity';
import { BaseTerrainMoveEffect } from './base/base-terrain-move-effect';

/**
 * グラスフィールド（Grassy Terrain）技の効果
 *
 * 5 ターンの間、地面にいるポケモンのくさ技の威力が 1.3 倍になり、ターン終了時に最大 HP の 1/16 回復する。
 * 地面にいる相手へのじしん・じならし・マグニチュードの威力は 0.5 倍になる。
 * フィールドの効果と終わりはエンジンが行う。すでにグラスフィールドなら何もしない
 */
export class GrassyTerrainEffect extends BaseTerrainMoveEffect {
  protected readonly field = Field.GrassyTerrain;
  protected readonly message = 'Grassy Terrain was set up!';
}
