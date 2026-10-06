import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * くちばしキャノン（Beak Blast）技の効果
 * ターンの初め、どちらの技よりも先にくちばしを加熱する（volatileState.beakBlast）。
 * 加熱している間に接触技を受けると、相手をやけどにする。くちばしキャノンを撃ったとき、またはターン終了時に加熱が終わる。
 * やけどにする処理と加熱の片付けはエンジンが行う。優先度 -3 は技のデータで決まる
 * ゆびをふるなどで呼ばれたときは、ターンの初めに選ばれていないので加熱しない（本家と同じ）
 */
export class BeakBlastEffect implements IMoveEffect {
  async onTurnStart(
    user: BattlePokemonStatus,
    _opponent: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    await battleContext.battleRepository?.patchVolatileState(user.id, { beakBlast: true });
    return 'started heating up its beak!';
  }
}
