import { Field } from '@/modules/battle/domain/entities/battle.entity';
import { BaseTerrainMoveEffect } from './base/base-terrain-move-effect';

/**
 * ミストフィールド（Misty Terrain）技の効果
 *
 * 5 ターンの間、地面にいるポケモンは状態異常・こんらんにならず、地面にいる相手へのドラゴン技の威力が半分になる。
 * フィールドの効果と終わりはエンジンが行う。すでにミストフィールドなら何もしない
 */
export class MistyTerrainEffect extends BaseTerrainMoveEffect {
  protected readonly field = Field.MistyTerrain;
  protected readonly message = 'Misty Terrain was set up!';
}
