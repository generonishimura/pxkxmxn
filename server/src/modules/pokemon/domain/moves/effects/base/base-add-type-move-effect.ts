import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { IMoveEffect } from '../../move-effect.interface';
import { hasType } from '../../../battle-events/battle-traits';
import { addType } from '../../../battle-events/type-change';

/**
 * 相手に 3 つめのタイプを足す技の基底クラス（ハロウィン・もりののろい）
 *
 * 相手がすでにそのタイプを持っていれば失敗する（3 つめのタイプも含めて判定する。本家の hasType）。
 * 前に足したタイプ（もりののろいのくさ・ハロウィンのゴースト）は置き換える（本家の addType）。
 * ひんしの相手には失敗する。
 */
export abstract class BaseAddTypeMoveEffect implements IMoveEffect {
  /** 足すタイプ（DB の Type.name） */
  protected abstract readonly typeName: string;

  /** メッセージに出すタイプの英語名 */
  protected abstract readonly typeLabel: string;

  async onUse(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (await hasType(defender, this.typeName, battleContext)) {
      return 'But it failed';
    }
    if (!(await addType(defender, this.typeName, battleContext))) {
      return 'But it failed';
    }
    return `The ${this.typeLabel} type was added to the target!`;
  }
}
