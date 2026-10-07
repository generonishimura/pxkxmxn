import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { transformInto } from '../../../battle-events/transform';

/**
 * かわりもの（Imposter）特性の効果
 * 場に出たとき、相手の場のポケモンにへんしんする（本家の onSwitchIn の transformInto）
 *
 * - 相手がひんし・へんしん中・みがわり中・イリュージョンで化けているなら、へんしんしない（transformInto が判定する）
 * - 写した特性が効いていれば、その特性の onEntry を呼ぶ（写したいかくが発動する）
 * - スキルスワップ・なりきりなどで受け取ったときは、へんしんしない（setAbility が onEntry を呼ばない）
 * 注: 重さ・性別は写さない（transformInto の注）
 */
export class ImposterEffect implements IAbilityEffect {
  async onEntry(holder: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    const repository = battleContext?.battleRepository;
    if (!battleContext || !repository) {
      return;
    }
    const battle = battleContext.battle;
    const opponentTrainerId =
      holder.trainerId === battle.trainer1Id ? battle.trainer2Id : battle.trainer1Id;
    const opponent = await repository.findActivePokemonByBattleIdAndTrainerId(
      battle.id,
      opponentTrainerId,
    );
    if (!opponent) {
      return;
    }
    await transformInto(holder, opponent, battleContext);
  }
}
