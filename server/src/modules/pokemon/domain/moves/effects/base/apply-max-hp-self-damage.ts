import { isIndirectDamagePrevented } from '../../../battle-events/indirect-damage';
import { BattleContext } from '../../../abilities/battle-context.interface';

/**
 * 使用者自身に「最大HP ÷ divisor」（端数処理は rounding で指定、最低1）のダメージを与える共通処理
 * 外したときの自傷（とびげり等）や、わるあがきの反動で使用する
 *
 * HP更新の手順は BaseRecoilEffect と同じ（最新のHPを取得してから減算し、0未満にしない）
 *
 * @param attackerId 使用者の BattlePokemonStatus ID
 * @param divisor 最大HPを割る数（例: 2 なら最大HPの1/2）
 * @param battleContext バトルコンテキスト
 * @param rounding 端数処理（'floor': 切り捨て、'round': 四捨五入）
 * @returns 与えたダメージ量（処理できなかった場合は null）
 */
export async function applyMaxHpSelfDamage(
  attackerId: number,
  divisor: number,
  battleContext: BattleContext,
  rounding: 'floor' | 'round' = 'floor',
): Promise<number | null> {
  if (!battleContext.battleRepository) {
    return null;
  }

  // 現在のHPを取得（最新の状態を取得するため）
  const currentStatus =
    await battleContext.battleRepository.findBattlePokemonStatusById(attackerId);
  if (!currentStatus) {
    return null;
  }
  // 技以外のダメージを受けない特性（マジックガード）なら自傷せず、null を返す
  if (await isIndirectDamagePrevented(currentStatus, battleContext)) {
    return null;
  }

  // 最大HP基準のダメージを計算（最低1）
  const roundFn = rounding === 'round' ? Math.round : Math.floor;
  const selfDamage = Math.max(1, roundFn(currentStatus.maxHp / divisor));

  // HPを更新（0未満にならないように制限）
  const newHp = Math.max(0, currentStatus.currentHp - selfDamage);
  await battleContext.battleRepository.updateBattlePokemonStatus(attackerId, {
    currentHp: newHp,
  });

  return selfDamage;
}
