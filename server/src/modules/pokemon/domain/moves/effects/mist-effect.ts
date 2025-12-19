import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 「しろいきり」の特殊効果実装
 *
 * 効果: 自分のステータス変化を防ぐ
 * 注意: 現時点では、バトルフィールドの状態として管理する機能がないため、簡易実装としてメッセージのみ返す
 */
export class MistEffect implements IMoveEffect {
  async onUse(
    _attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    _battleContext: BattleContext,
  ): Promise<string | null> {
    // TODO: バトルフィールドの状態として管理する機能を実装する必要がある
    return 'The user shrouded itself in a white mist!';
  }
}

