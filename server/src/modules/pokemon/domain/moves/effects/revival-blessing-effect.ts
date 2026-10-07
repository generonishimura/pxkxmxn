import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { hasFaintedPartyMember, requestSwitch } from '../../battle-events/switching';

/**
 * さいきのいのり（Revival Blessing）技の効果
 *
 * ひんしの手持ちを 1 匹、最大 HP の半分（切り捨て、最低 1）で復活させる。状態異常も治る。場には出さない。
 * ひんしの手持ちがいなければ失敗する。復活させるのは、行動のすぐあとにエンジンが行う（pendingChoice の revivalBlessing）
 * 注: 復活させるポケモンをプレイヤーが選ぶ API がまだないので、エンジンがひんしの手持ちの先頭（ID の順）を選ぶ
 */
export class RevivalBlessingEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!(await hasFaintedPartyMember(battleContext, attacker.trainerId))) {
      return 'But it failed';
    }
    await requestSwitch(battleContext, attacker.trainerId, 'revivalBlessing');
    return null;
  }
}
