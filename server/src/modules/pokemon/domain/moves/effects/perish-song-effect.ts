import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { tryApplyVolatile } from '../../battle-events/volatile-infliction';
import {
  getAbilityEffect,
  isIgnoredByMoldBreaker,
  resolveAbilityName,
} from '../../battle-events/ability-lookup';
import { MoveBehaviors } from '../move-behaviors';
import { moveEffectSource } from './base/base-stat-change-effect';

/**
 * ほろびのうたのカウント。ターン終了時に 3 → 2 → 1 → 0 と減り、0 のときのターン終了時にひんしになる
 * （使ったターンを含めて 4 回目のターン終了時。本家の duration: 4）
 */
const PERISH_COUNT = 3;

const PERISH_SONG_MOVE_NAME = 'ほろびのうた';

/**
 * ほろびのうた（Perish Song）技の効果
 *
 * 場のポケモン全員（自分と相手）に、ほろびのうたのカウント（volatileState.perishCount）を 3 書く。
 * ひんしにするのはエンジン（使ったターンを含めて 4 回目のターン終了時）。交代するとカウントは消える。
 * - すでにカウントがあるポケモンは、カウントを変えない
 * - 相手の特性の isImmuneToMove（ぼうおんなど）で、相手には付かない。使い手のかたやぶり・きんしのちからで無視される。
 *   自分の特性では防がない（本家と同じく、自分のぼうおんでも自分には付く）
 * - そらをとぶなどで隠れている相手には付かない（ロックオン中は付く）
 * - 誰にも付かず、防いだポケモンもいなければ失敗する（両者にすでにカウントがあるときなど）
 * - みがわりは無視する（MoveBehaviors の bypassSubstitute）
 */
export class PerishSongEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const source = moveEffectSource(attacker, battleContext);
    let affected = false;
    let blocked = false;

    for (const target of attacker.id === defender.id ? [attacker] : [attacker, defender]) {
      if (target.id !== attacker.id && (await this.isBlocked(attacker, target, battleContext))) {
        blocked = true;
        continue;
      }
      const applied = await tryApplyVolatile(
        target,
        'perishSong',
        { perishCount: PERISH_COUNT },
        battleContext,
        { source },
      );
      affected = affected || applied;
    }

    if (affected) {
      return 'All Pokemon hearing the song will faint in three turns!';
    }
    return blocked ? null : 'But it failed';
  }

  /**
   * 相手に届かないか（隠れている・特性で無効）。ひんしの相手は防いだことにしない
   */
  private async isBlocked(
    attacker: BattlePokemonStatus,
    target: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<boolean> {
    if (target.currentHp <= 0) {
      return false;
    }
    const hidden = target.volatileState.semiInvulnerable;
    if (
      hidden !== undefined &&
      attacker.volatileState.lockOnTurns === undefined &&
      !MoveBehaviors.hitsSemiInvulnerable(hidden, PERISH_SONG_MOVE_NAME)
    ) {
      return true;
    }

    const targetAbilityName = await resolveAbilityName(target, battleContext);
    const attackerAbilityName = await resolveAbilityName(attacker, battleContext);
    // 技のコンテキストを渡す（きんしのちからは、変化技のときだけ相手の特性を無視する）
    if (await isIgnoredByMoldBreaker(attackerAbilityName, targetAbilityName, battleContext)) {
      return false;
    }
    const targetAbility = await getAbilityEffect(targetAbilityName);
    return targetAbility?.isImmuneToMove?.(target, battleContext) === true;
  }
}
