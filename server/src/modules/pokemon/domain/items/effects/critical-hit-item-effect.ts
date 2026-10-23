import { IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * ピントレンズ（Scope Lens）
 * 持ち主の技の急所ランクを 1 上げる（本家の onModifyCritRatio の critRatio + 1）
 */
export class ScopeLensEffect implements IItemEffect {
  modifyCritRatio(_holder: BattlePokemonStatus, stage: number): number {
    return stage + 1;
  }
}

/**
 * ながねぎ（Leek）
 * カモネギ・ネギガナイトが持つと、技の急所ランクを 2 上げる（本家の onModifyCritRatio の critRatio + 2）
 *
 * ポケモンの種類は、技の使用者のもとの全国図鑑の番号（battleContext.attackerNationalDex）で判定する
 * （ガラルのカモネギも、カモネギと同じ番号）
 */
export class LeekEffect implements IItemEffect {
  /**
   * カモネギ（83）・ネギガナイト（865）の全国図鑑の番号
   */
  private static readonly HOLDER_NATIONAL_DEX: readonly number[] = [83, 865];

  private static readonly CRIT_STAGE_BOOST = 2;

  modifyCritRatio(
    _holder: BattlePokemonStatus,
    stage: number,
    battleContext?: BattleContext,
  ): number | undefined {
    const nationalDex = battleContext?.attackerNationalDex;
    if (nationalDex === undefined || !LeekEffect.HOLDER_NATIONAL_DEX.includes(nationalDex)) {
      return undefined;
    }
    return stage + LeekEffect.CRIT_STAGE_BOOST;
  }
}
