import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { resolveCurrentAbilityName, setAbility } from '../../battle-events/ability-change';
import { hasAbilityFlag } from '@/modules/battle/domain/logic/ability-flags';

/** なまけ（なかまづくりで書き換えられない） */
const TRUANT_ABILITY_NAME = 'なまけ';

/**
 * なかまづくり（Entrainment）技の効果
 * 相手の特性を、使用者の今の特性と同じにする
 *
 * - 写すのは使用者の今の特性（上書きされた特性も写す。本家の source.ability）
 * - 次のときは失敗する（本家の onTryHit と同じ）
 *   - 使用者に特性がない・使用者の特性がなかまづくりで写せない特性（noEntrain）
 *   - 相手の今の特性が使用者と同じ・消せない特性（cantSuppress）・なまけ
 * - 相手が受け取った特性の onEntry は setAbility が呼ぶ（受け取ったいかくが発動する）
 * - みがわり・まもる系・マジックコートはエンジンが判定する
 * 注: 書き換える前の相手の特性の終わり（本家の End）は呼ばない（setAbility の近似）
 */
export class EntrainmentEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const failed = 'But it failed';
    const abilityName = await resolveCurrentAbilityName(attacker, battleContext);
    const targetAbilityName = await resolveCurrentAbilityName(defender, battleContext);
    if (
      !abilityName ||
      hasAbilityFlag(abilityName, 'noEntrain') ||
      targetAbilityName === abilityName ||
      targetAbilityName === TRUANT_ABILITY_NAME ||
      hasAbilityFlag(targetAbilityName, 'cantSuppress')
    ) {
      return failed;
    }
    const { changed } = await setAbility(defender, abilityName, battleContext);
    return changed ? `The target's ability became ${abilityName}!` : failed;
  }
}
