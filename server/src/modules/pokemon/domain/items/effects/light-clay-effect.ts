import { FieldTurnsTarget, IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';

/**
 * 長くする壁（陣営の守りのキー）
 */
const SCREEN_TURN_KEYS: readonly string[] = ['reflectTurns', 'lightScreenTurns', 'auroraVeilTurns'];

/**
 * ひかりのねんど（Light Clay）
 * 持ち主が張ったリフレクター・ひかりのかべ・オーロラベールが 8 ターン続く（ふつうは 5 ターン）
 *
 * 残りターン数は、技を使ったときに BaseSideConditionMoveEffect が modifyFieldTurns で決める
 */
export class LightClayEffect implements IItemEffect {
  private static readonly EXTENDED_TURNS = 8;

  modifyFieldTurns(_holder: BattlePokemonStatus, target: FieldTurnsTarget): number | undefined {
    return target.kind === 'sideCondition' && SCREEN_TURN_KEYS.includes(target.key)
      ? LightClayEffect.EXTENDED_TURNS
      : undefined;
  }
}
