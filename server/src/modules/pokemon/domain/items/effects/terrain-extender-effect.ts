import { FieldTurnsTarget, IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';

/**
 * グランドコート（Terrain Extender）
 * 持ち主が出したフィールド（エレキ・グラス・サイコ・ミスト）が 8 ターン続く（ふつうは 5 ターン）
 *
 * 技（エレキフィールドなど）でも特性（エレキメイカーなど）でも、setTerrain に出したポケモンを渡したときに効く
 */
export class TerrainExtenderEffect implements IItemEffect {
  private static readonly EXTENDED_TURNS = 8;

  modifyFieldTurns(_holder: BattlePokemonStatus, target: FieldTurnsTarget): number | undefined {
    return target.kind === 'terrain' ? TerrainExtenderEffect.EXTENDED_TURNS : undefined;
  }
}
