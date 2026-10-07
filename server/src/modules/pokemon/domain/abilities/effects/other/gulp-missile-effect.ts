import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { HitResult } from '../../../battle-events/hit-result';
import { changeForm } from '../../../battle-events/form-change';
import { applyIndirectDamage } from '../../../battle-events/indirect-damage';
import { fractionOfMaxHp } from '../../../battle-events/heal';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { tryInflictStatus } from '../../../battle-events/status-infliction';
import { EffectSource } from '../../../battle-events/effect-source';
import { joinStatChangeMessages } from '../../../moves/effects/base/base-stat-change-effect';
import { isSpecies } from '../base/is-species';

/**
 * うのミサイルの特性名
 */
export const GULP_MISSILE_ABILITY_NAME = 'うのミサイル';

/**
 * ウッウの全国図鑑の番号
 */
const CRAMORANT_NATIONAL_DEX = 845;

/**
 * なみのりの技名（当てるとエサをくわえる）
 */
const SURF_MOVE_NAME = 'なみのり';

/**
 * うのみのすがた（防御-1）・まるのみのすがた（まひ）
 */
const GULPING_FORM = 'gulping';
const GORGING_FORM = 'gorging';

/**
 * ウッウにエサをくわえさせる（なみのり・ダイビングで使う。本家の Gulp Missile の onSourceTryPrimaryHit と Dive の onTryMove）
 * HP が最大HPの半分より多ければうのみのすがた、半分以下ならまるのみのすがたにする（交代で戻るフォルム）
 * もとのすがたのウッウでなければ（すでにくわえている・ひんし・へんしん中・ほかのポケモン）変えない
 * @returns フォルムを変えたら true
 */
export const changeToGulpMissileForm = async (
  holder: BattlePokemonStatus,
  battleContext: BattleContext,
): Promise<boolean> => {
  if (
    holder.currentHp <= 0 ||
    holder.volatileState.form !== undefined ||
    holder.volatileState.transformedIntoStatusId !== undefined ||
    !(await isSpecies(holder, CRAMORANT_NATIONAL_DEX, battleContext))
  ) {
    return false;
  }
  const form = holder.currentHp <= holder.maxHp / 2 ? GORGING_FORM : GULPING_FORM;
  return changeForm(holder, form, battleContext);
};

/**
 * うのミサイル（Gulp Missile）特性の効果
 * ウッウがなみのり・ダイビングを使うとエサをくわえ、くわえている間に攻撃技を受けると、相手にエサを吐き出す
 *
 * - なみのりでダメージを与えたヒットのあと（onSourceDamagingHit）にエサをくわえる。
 *   ダイビングは、技の効果（DiveEffect）のため技の 1 ターン目にくわえる
 * - くわえるのは HP が最大HPの半分より多ければうのみのすがた、半分以下ならまるのみのすがた（交代で戻る）
 * - くわえているときに攻撃技のダメージを受けると（ひんしになったヒットでも）、相手に相手の最大HPの1/4
 *   （切り捨て、最低1）のダメージを与え、うのみなら防御を1段階下げ、まるのみならまひにする。そのあと、もとのすがたに戻る
 * - 吐き出すダメージは技以外のダメージなので、相手のマジックガードで防がれる（防御の低下・まひは起きる）
 * - 相手がひんしのとき、相手が場にいないとき（控えのポケモンのみらいよち・はめつのねがい）、
 *   ダイビングで隠れているときは吐き出さず、フォルムもそのまま（本家と同じ）
 * - 消せない特性で、かたやぶりで無視されない。へんしん中は効かない（エンジンの noTransform の判定）
 * 注: 本家のなみのりは命中・まもる系のあと、ダメージの前（onSourceTryPrimaryHit）にくわえる。
 *     ここではダメージを与えたヒットのあとなので、ダメージを与えなかったヒット（みがわり・ばけのかわなど）ではくわえない
 */
export class GulpMissileEffect implements IAbilityEffect {
  async onSourceDamagingHit(
    holder: BattlePokemonStatus,
    _target: BattlePokemonStatus,
    _hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (battleContext?.moveName === SURF_MOVE_NAME) {
      await changeToGulpMissileForm(holder, battleContext);
    }
    return null;
  }

  async onDamagingHit(
    holder: BattlePokemonStatus,
    attacker: BattlePokemonStatus,
    _hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    const form = holder.volatileState.form;
    if (
      !battleContext?.battleRepository ||
      (form !== GULPING_FORM && form !== GORGING_FORM) ||
      attacker.currentHp <= 0 ||
      !attacker.isActive ||
      holder.volatileState.semiInvulnerable !== undefined
    ) {
      return null;
    }

    await applyIndirectDamage(attacker, fractionOfMaxHp(attacker, 4), battleContext);
    const latestAttacker =
      (await battleContext.battleRepository.findBattlePokemonStatusById(attacker.id)) ?? attacker;
    const effectMessage =
      latestAttacker.currentHp > 0
        ? await this.applySpitEffect(holder, latestAttacker, form, battleContext)
        : null;

    // もとのすがたに戻す（ひんしなら changeForm は書かないので、フォルムだけ消す）
    if (holder.currentHp > 0) {
      await changeForm(holder, null, battleContext);
    } else {
      await battleContext.battleRepository.patchVolatileState(holder.id, { form: null });
    }
    return ['Gulp Missile activated!', effectMessage].filter(Boolean).join(' ');
  }

  /**
   * 吐き出したエサの追加の効果（うのみ: 防御-1、まるのみ: まひ）
   */
  private async applySpitEffect(
    holder: BattlePokemonStatus,
    attacker: BattlePokemonStatus,
    form: typeof GULPING_FORM | typeof GORGING_FORM,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const source: EffectSource = {
      pokemon: holder,
      kind: 'ability',
      name: GULP_MISSILE_ABILITY_NAME,
    };
    if (form === GULPING_FORM) {
      return joinStatChangeMessages(
        await applyStatChanges(attacker, [{ statType: 'defense', rankChange: -1 }], battleContext, {
          source,
        }),
      );
    }
    const { inflicted } = await tryInflictStatus(
      attacker,
      StatusCondition.Paralysis,
      battleContext,
      { source },
    );
    return inflicted ? 'was paralyzed!' : null;
  }
}
