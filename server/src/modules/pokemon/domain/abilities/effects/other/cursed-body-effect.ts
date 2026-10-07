import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { findMoveSlot, resolveMoveSlots } from '@/modules/battle/domain/logic/move-selection';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { tryApplyVolatile } from '../../../battle-events/volatile-infliction';
import { MoveBehaviors } from '../../../moves/move-behaviors';

/**
 * のろわれボディ（Cursed Body）特性の効果
 * 技でダメージを受けたとき、30% の確率で相手が最後に出した技をかなしばりにする
 *
 * - ヒットごとに判定する（本家の onDamagingHit と同じ）。接触しない技でも発動する
 * - かなしばりにするのは、相手の lastMoveId の技（ゆびをふるで出た技なら、ゆびをふる。本家の lastMove と同じ）
 * - 残りターン数は 4（本家の duration 5 から、技を出している最中なので 1 引く）。
 *   おどりこで出した技（本家の isExternal）では引かずに 5
 *   注: 本家は、おどりこで出した技でも、おどりこのポケモンがこのターンまだ行動していなければ（queue.willMove）
 *       1 引いて 4 にする。エンジンが呼ばれた技に「使用者がこのあと行動するか」を渡さないので、ここでは常に 5 にしている
 * - 次のときは発動しない: 相手がすでにかなしばりを受けている、わるあがき・みらいよち・はめつのねがい、
 *   最後に出した技の PP が 0、アロマベールなどで防がれる（tryApplyVolatile が判定する）。
 *   最後に出した技が技の欄にない（ものまねで変わったなど）ときは、本家と同じく発動する
 * - 確率は追加効果ではないので、てんのめぐみ・りんぷんの影響を受けない（本家と同じ）
 */
export class CursedBodyEffect implements IAbilityEffect {
  private static readonly CHANCE = 0.3;
  private static readonly ABILITY_NAME = 'のろわれボディ';
  private static readonly TURNS = 4;
  private static readonly EXTERNAL_MOVE_TURNS = 5;
  private static readonly STRUGGLE = 'わるあがき';
  /** 技を出している最中として扱わない呼び出し元（本家の isExternal） */
  private static readonly EXTERNAL_CALLERS: readonly string[] = ['おどりこ'];

  async onDamagingHit(
    holder: BattlePokemonStatus,
    attacker: BattlePokemonStatus,
    _hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext?.battleRepository || attacker.volatileState.disable !== undefined) {
      return null;
    }
    const moveName = battleContext.moveName;
    if (
      moveName === CursedBodyEffect.STRUGGLE ||
      (moveName !== undefined && MoveBehaviors.has(moveName, 'futureMove'))
    ) {
      return null;
    }
    if (Math.random() >= CursedBodyEffect.CHANCE) {
      return null;
    }

    const moveId = attacker.volatileState.lastMoveId;
    if (moveId === undefined) {
      return null;
    }
    const moves =
      await battleContext.battleRepository.findBattlePokemonMovesByBattlePokemonStatusId(
        attacker.id,
      );
    const slot = findMoveSlot(resolveMoveSlots(moves, attacker.volatileState), moveId);
    // 本家のかなしばりの onStart と同じく、欄の PP が 0 のときだけ失敗する（欄がないときは止めない）
    if (slot !== undefined && slot.currentPp <= 0) {
      return null;
    }

    const external =
      battleContext.calledBy !== undefined &&
      CursedBodyEffect.EXTERNAL_CALLERS.includes(battleContext.calledBy);
    const turns = external ? CursedBodyEffect.EXTERNAL_MOVE_TURNS : CursedBodyEffect.TURNS;
    const applied = await tryApplyVolatile(
      attacker,
      'disable',
      { disable: { moveId, turns } },
      battleContext,
      {
        source: {
          pokemon: holder,
          abilityName: CursedBodyEffect.ABILITY_NAME,
          kind: 'ability',
          name: CursedBodyEffect.ABILITY_NAME,
        },
      },
    );
    return applied ? `${CursedBodyEffect.ABILITY_NAME} activated! was disabled!` : null;
  }
}
