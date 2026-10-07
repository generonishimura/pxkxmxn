import { IAbilityEffect } from '../../ability-effect.interface';
import { BattleContext } from '../../battle-context.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { isMajorStatus } from '@/modules/battle/domain/logic/major-status';
import { changeForm } from '../../../battle-events/form-change';
import type { VolatileKind } from '../../../battle-events/volatile-infliction';

/** メテノの全国図鑑の番号 */
const MINIOR_NATIONAL_DEX = 774;
/** コアのすがた */
const CORE_FORM = 'core';

/**
 * リミットシールド（Shields Down）特性の効果
 * メテノが、場に出たとき（onEntry）とターン終了時（onTurnEnd）に、HP が最大 HP の半分以下ならコアのすがた（'core'）になり、
 * 半分より上ならりゅうせいのすがた（null。既定の 'meteor'）に戻る。フォルムは交代で戻る（volatileState.form）
 * りゅうせいのすがたの間は、状態異常（canReceiveStatusCondition）とあくび（canReceiveVolatile）を受けない。
 * こんらんなど、ほかの一時的な状態は防がない。本家と同じく、かたやぶりでは無視されない
 * へんしん中・メテノでなければ、フォルムは変わらない
 * 注: 状態異常・あくびを防ぐ判定は同期のフックなので、ポケモンの種類（全国図鑑の番号）を見ない。
 *     この特性を持つポケモンを、フォルムが 'core' でない間はりゅうせいのすがたとして扱う
 * 注: フォルムが変わったメッセージは出ない（onEntry・onTurnEnd はメッセージを返せない）
 */
export class ShieldsDownEffect implements IAbilityEffect {
  readonly unaffectedByMoldBreaker = true;

  async onEntry(holder: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    await this.updateForm(holder, battleContext);
  }

  async onTurnEnd(holder: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    await this.updateForm(holder, battleContext);
  }

  canReceiveStatusCondition(
    holder: BattlePokemonStatus,
    statusCondition: StatusCondition,
  ): boolean | undefined {
    return this.isMeteorForm(holder) && isMajorStatus(statusCondition) ? false : undefined;
  }

  canReceiveVolatile(holder: BattlePokemonStatus, kind: VolatileKind): boolean | undefined {
    return this.isMeteorForm(holder) && kind === 'yawn' ? false : undefined;
  }

  private isMeteorForm(holder: BattlePokemonStatus): boolean {
    return (
      holder.volatileState.transformedIntoStatusId === undefined &&
      holder.volatileState.form !== CORE_FORM
    );
  }

  private async updateForm(
    holder: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<void> {
    if (!battleContext || holder.currentHp <= 0) {
      return;
    }
    const trainedPokemon = await battleContext.trainedPokemonRepository?.findById(
      holder.trainedPokemonId,
    );
    if (trainedPokemon?.pokemon.nationalDex !== MINIOR_NATIONAL_DEX) {
      return;
    }
    const form = holder.currentHp * 2 <= holder.maxHp ? CORE_FORM : null;
    await changeForm(holder, form, battleContext);
  }
}
