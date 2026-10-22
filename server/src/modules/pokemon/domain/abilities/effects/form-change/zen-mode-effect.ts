import { IAbilityEffect } from '../../ability-effect.interface';
import { BattleContext } from '../../battle-context.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { changeForm } from '../../../battle-events/form-change';

/** ヒヒダルマの全国図鑑の番号 */
const DARMANITAN_NATIONAL_DEX = 555;

/**
 * ダルマモード（Zen Mode）特性の効果
 * ヒヒダルマが、ターン終了時（onTurnEnd）に HP が最大 HP の半分以下ならダルマモード（'zen'）になり、
 * 半分より上ならノーマルモード（null。既定の 'standard'）に戻る。フォルムは交代で戻る（volatileState.form）。
 * 場に出たときは変わらない（本家と同じく、次のターン終了時に判定する）。へんしん中・ヒヒダルマでなければ何もしない
 * 注: ガラルのすがた（'galar-zen'）は DB にない（全国図鑑の番号ごとに既定のすがただけ）ので、いつもイッシュのすがたで変わる
 * 注: フォルムが変わったメッセージは出ない（onTurnEnd はメッセージを返せない）
 */
export class ZenModeEffect implements IAbilityEffect {
  async onTurnEnd(holder: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    if (!battleContext || holder.currentHp <= 0) {
      return;
    }
    const trainedPokemon = await battleContext.trainedPokemonRepository?.findById(
      holder.trainedPokemonId,
    );
    if (trainedPokemon?.pokemon.nationalDex !== DARMANITAN_NATIONAL_DEX) {
      return;
    }
    const form = holder.currentHp * 2 <= holder.maxHp ? 'zen' : null;
    await changeForm(holder, form, battleContext);
  }
}
