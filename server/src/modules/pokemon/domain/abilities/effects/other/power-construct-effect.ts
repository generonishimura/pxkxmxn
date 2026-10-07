import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { changeForm } from '../../../battle-events/form-change';
import { isSpecies } from '../base/is-species';

/**
 * ジガルデの全国図鑑の番号
 */
const ZYGARDE_NATIONAL_DEX = 718;

/**
 * スワームチェンジ（Power Construct）特性の効果
 * ターン終了時、ジガルデの HP が最大HPの半分以下なら、パーフェクトフォルムになる
 *
 * - フォルムは交代しても戻らない 'complete'（persistentState.form）。バトルが終わるまで戻らない
 * - 最大HPはパーフェクトフォルムの種族値で計算し直し、減った HP は保つ（changeForm が行う。本家の updateMaxHp）
 * - ひんし・へんしん中・すでにパーフェクトフォルムなら何もしない。ジガルデでなければ何もしない
 * 注: DB は全国図鑑の番号ごとに既定のすがた（50%フォルム）だけなので、10%フォルムからの変化は扱わない
 */
export class PowerConstructEffect implements IAbilityEffect {
  async onTurnEnd(holder: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    if (
      !battleContext ||
      holder.currentHp <= 0 ||
      holder.currentHp > holder.maxHp / 2 ||
      !(await isSpecies(holder, ZYGARDE_NATIONAL_DEX, battleContext))
    ) {
      return;
    }
    await changeForm(holder, 'complete', battleContext, { persistent: true });
  }
}
