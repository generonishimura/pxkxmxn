import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { resolveCurrentAbilityName, setAbility } from '../../../battle-events/ability-change';
import { hasAbilityFlag } from '@/modules/battle/domain/logic/ability-flags';

const TRACE_ABILITY_NAME = 'トレース';

/**
 * トレース（Trace）特性の効果
 * 場に出たとき、相手の特性を写して自分の特性にする
 *
 * - 写すのは相手の今の特性（上書きされた特性も写す。いえきで消されていても写す。本家の target.ability）
 * - トレースで写せない特性（noTrace）・ひんしの相手からは写さない
 * - 写せなかったら、今の特性がまだトレースの間、あとから出てきた相手の特性を写す（onFoeEntry。本家の onUpdate の seek）
 * - 写した特性の onEntry は setAbility が呼ぶ（写したいかくが発動する）。消せない特性（cantSuppress）は setAbility が写さない
 * 注: 本家は相手の特性が交代以外で写せる特性に変わったとき（スキルスワップなど）にも写すが、ここでは相手が出てきたときだけ写す
 */
export class TraceEffect implements IAbilityEffect {
  async onEntry(holder: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    if (!battleContext?.battleRepository) {
      return;
    }
    const battle = battleContext.battle;
    const opponentTrainerId =
      holder.trainerId === battle.trainer1Id ? battle.trainer2Id : battle.trainer1Id;
    const opponent = await battleContext.battleRepository.findActivePokemonByBattleIdAndTrainerId(
      battle.id,
      opponentTrainerId,
    );
    if (opponent) {
      await this.copyAbility(holder, opponent, battleContext);
    }
  }

  async onFoeEntry(
    holder: BattlePokemonStatus,
    entered: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<void> {
    if (!battleContext) {
      return;
    }
    // もう写したあと（今の特性がトレースでない）なら写さない
    if ((await resolveCurrentAbilityName(holder, battleContext)) !== TRACE_ABILITY_NAME) {
      return;
    }
    await this.copyAbility(holder, entered, battleContext);
  }

  private async copyAbility(
    holder: BattlePokemonStatus,
    target: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<void> {
    if (target.currentHp <= 0) {
      return;
    }
    const abilityName = await resolveCurrentAbilityName(target, battleContext);
    if (!abilityName || hasAbilityFlag(abilityName, 'noTrace')) {
      return;
    }
    await setAbility(holder, abilityName, battleContext);
  }
}
