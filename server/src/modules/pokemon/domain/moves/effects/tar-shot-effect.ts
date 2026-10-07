import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { applyStatChanges } from '../../battle-events/stat-change';
import { tryApplyVolatile } from '../../battle-events/volatile-infliction';
import { joinStatChangeMessages, moveEffectSource } from './base/base-stat-change-effect';

/**
 * タールショット（Tar Shot）技の効果
 *
 * 相手の素早さを 1 段階下げ、相手を tarShot の状態にする（ほのお技の相性を 2 倍にするのはエンジン）。
 * 本家と同じく、素早さの低下とタールショットの状態は別々に判定する。
 * - すでにタールショットを受けていても、素早さは下げる
 * - 素早さが -6 でも、クリアボディなどで下がらなくても、タールショットの状態にはする
 * - どちらも起きなければ失敗する
 * 交代で引っ込むと消える（バトンタッチでは引き継ぐ。エンジンが行う）。
 *
 * 注: テラスタルの仕組みがないため、テラスタルしたポケモンには効かない判定はしない
 */
export class TarShotEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const repository = battleContext.battleRepository;
    if (!repository) {
      return null;
    }

    const source = moveEffectSource(attacker, battleContext);
    const statMessage = joinStatChangeMessages(
      await applyStatChanges(defender, [{ statType: 'speed', rankChange: -1 }], battleContext, {
        source,
      }),
    );
    const latestDefender = (await repository.findBattlePokemonStatusById(defender.id)) ?? defender;
    const tarred = await tryApplyVolatile(
      latestDefender,
      'tarShot',
      { tarShot: true },
      battleContext,
      { source },
    );

    const messages = [statMessage, tarred ? 'became weaker to fire!' : null].filter(
      (message): message is string => message !== null,
    );
    return messages.length > 0 ? messages.join(' ') : 'But it failed';
  }
}
