import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * マジックガード（Magic Guard）特性の効果
 * 攻撃技によるダメージ以外のダメージを受けない
 *
 * - 技以外のダメージ（preventsIndirectDamage で判定するもの）を受けない: どく・もうどく・やけど、反動、
 *   外したときの自傷（とびげりなど）、わるあがきの反動、さめはだ・ゆうばく、ナイトメア、ヘドロえき
 * - 与えたダメージに応じた反動（すてみタックルなど）も受けない（preventsRecoil）
 * - こんらんの自傷は防がない（本家と同じ）。かたやぶりでは無視されない
 * 注: 天候・やどりぎのタネ・ステルスロックなどのダメージは、エンジンにまだないため扱わない
 */
export class MagicGuardEffect implements IAbilityEffect {
  readonly preventsIndirectDamage = true;
  readonly preventsRecoil = true;
}
