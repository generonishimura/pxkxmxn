import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * なまけ（Truant）特性の効果
 * 技を出したら、次のターンは休んで動けない（技を出す前の判定で止まり、PP も減らない）。休んだ次のターンはまた技を出せる
 * - 場に出たターンは動ける（交代で引っ込むと volatileState.loafing は消える）
 * - ねむり・こおりで動けないターンは、休みの番が進まない（本家と同じく、この判定より前に止まる）
 * - 反動で動けないターンは休みの代わりになる（エンジンが loafing を消す）
 * - ゆびをふるなどで呼ばれた技では判定しない（エンジンが呼ばない）
 *
 * 注: 本家は、スキルスワップなどで場に出たまま なまけ になったとき、このターンもう行動していれば次のターンを休みにする。
 * ここでは特性が変わったときのフックがないので、変わったあとの最初の技は出せる
 */
export class TruantEffect implements IAbilityEffect {
  async onBeforeMove(
    holder: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    const loafing = holder.volatileState.loafing === true;
    await battleContext?.battleRepository?.patchVolatileState(holder.id, {
      loafing: loafing ? null : true,
    });
    return loafing ? 'is loafing around!' : null;
  }
}
