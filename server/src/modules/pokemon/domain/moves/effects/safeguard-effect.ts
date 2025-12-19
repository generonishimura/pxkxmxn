import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 「しんぴのまもり」の特殊効果実装
 *
 * 効果: 5ターン間、状態異常を防ぐ
 * 注意: 現時点では、バトルフィールドの状態として管理する機能がないため、簡易実装としてメッセージのみ返す
 */
export class SafeguardEffect implements IMoveEffect {
  async onUse(
    _attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    _battleContext: BattleContext,
  ): Promise<string | null> {
    // TODO: バトルフィールドの状態として管理する機能を実装する必要がある
    return 'The user shrouded itself in a mystical veil!';
  }
}

