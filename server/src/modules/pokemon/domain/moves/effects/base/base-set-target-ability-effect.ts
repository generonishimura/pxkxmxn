import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { resolveCurrentAbilityName, setAbility } from '../../../battle-events/ability-change';

/**
 * 相手の特性を決まった特性に書き換える技の基底クラス（なやみのタネ・シンプルビーム）
 *
 * 相手の今の特性（いえきで消されているかは見ない）が failingAbilityNames のどれかか、
 * 消せない特性（cantSuppress）なら失敗する。書き換えた特性は始まる
 */
export abstract class BaseSetTargetAbilityEffect implements IMoveEffect {
  /** 書き換えたあとの特性名 */
  protected abstract readonly abilityName: string;

  /** 相手の今の特性がこれなら失敗する特性名 */
  protected abstract readonly failingAbilityNames: readonly string[];

  async onUse(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }
    const currentAbilityName = await resolveCurrentAbilityName(defender, battleContext);
    if (currentAbilityName !== undefined && this.failingAbilityNames.includes(currentAbilityName)) {
      return 'But it failed';
    }
    if (!(await setAbility(defender, this.abilityName, battleContext)).changed) {
      return 'But it failed';
    }
    const message = `The target acquired ${this.abilityName}!`;
    const afterMessage = await this.afterAbilityChange(defender, battleContext);
    return afterMessage ? `${message} ${afterMessage}` : message;
  }

  /**
   * 書き換えたあとの効果（なやみのタネのねむりを治す）
   * @returns メッセージ（nullの場合は何も起こらない）
   */
  protected afterAbilityChange(
    _target: BattlePokemonStatus,
    _battleContext: BattleContext,
  ): Promise<string | null> {
    return Promise.resolve(null);
  }
}
