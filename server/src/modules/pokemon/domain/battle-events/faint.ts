import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../abilities/battle-context.interface';
import { getAbilityEffect } from './ability-lookup';
import { resolveBattleAbilityName } from './battle-traits';

/**
 * ひんしを知った特性が出したメッセージ
 */
export interface FaintNotice {
  /** 特性を持つポケモン（BattlePokemonStatus の ID） */
  readonly holderId: number;
  /** 特性を持つポケモンのトレーナー */
  readonly trainerId: number;
  readonly message: string;
}

/**
 * ポケモンがひんしになったことを、場のひんしでないポケモンの特性（onAnyFaint）に知らせる
 * ひんしの原因（技・反動・状態異常・接触特性・設置技など）と陣営は問わない（本家の onAnyFaint）。
 * ExecuteTurnUseCase が、新しくひんしになったポケモンごとに 1 回だけ呼ぶ。技・特性の実装から呼ぶ必要はない
 *
 * - 特性は実効の特性（いえき・かがくへんかガスで消えていれば呼ばない）
 * - ひんしになったポケモン自身と、ひんしの持ち主の特性は呼ばない
 * 注: 本家は素早さの順に呼ぶが、ここでは ID の順に呼ぶ
 * @param fainted ひんしになったポケモン
 * @returns 特性が出したメッセージ（呼んだ順）
 */
export const notifyFaint = async (
  fainted: BattlePokemonStatus,
  battleContext: BattleContext,
): Promise<FaintNotice[]> => {
  const repository = battleContext.battleRepository;
  if (!repository) {
    return [];
  }
  const battle = (await repository.findById(battleContext.battle.id)) ?? battleContext.battle;
  const holders = ((await repository.findBattlePokemonStatusByBattleId(battle.id)) ?? [])
    .filter(status => status.id !== fainted.id && status.isActive && !status.isFainted())
    .sort((a, b) => a.id - b.id);
  const context: BattleContext = { ...battleContext, battle };
  const notices: FaintNotice[] = [];
  for (const holder of holders) {
    const effect = await getAbilityEffect(await resolveBattleAbilityName(holder, context));
    if (!effect?.onAnyFaint) {
      continue;
    }
    // 先に呼んだ特性が変えた状態を見るよう、読み直す
    const latest = await repository.findBattlePokemonStatusById(holder.id);
    if (!latest || latest.isFainted()) {
      continue;
    }
    const message = await effect.onAnyFaint(latest, fainted, context);
    if (message) {
      notices.push({ holderId: holder.id, trainerId: holder.trainerId, message });
    }
  }
  return notices;
};
