import { IAbilityEffect } from '../../ability-effect.interface';
import { BattleContext } from '../../battle-context.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';

/**
 * とうそうしん（Rivalry）特性の効果
 * 相手と同じ性別なら与えるダメージが1.25倍、違う性別なら0.75倍になる
 *
 * - 自分か相手のどちらかが性別不明（または性別が登録されていない）なら、補正しない（本家と同じ）
 * - 性別は育成ポケモン（TrainedPokemon.gender）から引く
 *
 * 注: 本家は威力に掛ける（onBasePower）が、威力の補正（modifyBasePower）は同期の処理で性別を引けないため、
 * ダメージの補正（modifyDamageDealt）で掛ける。ダメージ式の +2 や途中の切り捨てにも倍率が掛かるので、
 * 本家と1〜2違うことがある
 */
export class RivalryEffect implements IAbilityEffect {
  /**
   * 同じ性別のときの倍率
   */
  private static readonly SAME_GENDER_MULTIPLIER = 1.25;

  /**
   * 違う性別のときの倍率
   */
  private static readonly OPPOSITE_GENDER_MULTIPLIER = 0.75;

  async modifyDamageDealt(
    pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): Promise<number | undefined> {
    const repository = battleContext?.trainedPokemonRepository;
    const defender = battleContext?.defender;
    if (!repository || !defender) {
      return undefined;
    }

    const [attackerTrained, defenderTrained] = await Promise.all([
      repository.findById(pokemon.trainedPokemonId),
      repository.findById(defender.trainedPokemonId),
    ]);
    const attackerGender = this.toKnownGender(attackerTrained?.gender);
    const defenderGender = this.toKnownGender(defenderTrained?.gender);
    if (!attackerGender || !defenderGender) {
      return undefined;
    }

    return attackerGender === defenderGender
      ? damage * RivalryEffect.SAME_GENDER_MULTIPLIER
      : damage * RivalryEffect.OPPOSITE_GENDER_MULTIPLIER;
  }

  /**
   * オス・メスのどちらかなら返す（性別不明・未登録は undefined）
   */
  private toKnownGender(gender: Gender | null | undefined): Gender | undefined {
    return gender === Gender.Male || gender === Gender.Female ? gender : undefined;
  }
}
