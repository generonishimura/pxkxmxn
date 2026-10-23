import { BaseContactStatusConditionEffect } from '../base/base-contact-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * とびだすハバネロ（Spicy Spray）特性の効果（メガスコヴィラン）
 * 攻撃技のダメージを受けたヒットのたびに、攻撃した相手を必ずやけどにする。接触しない技でも発動する
 * （本家の onDamagingHit で source.trySetStatus('brn')）
 *
 * ほのおタイプ・すでに状態異常の相手・やけどにならない特性の相手は、やけどにならない
 */
export class SpicySprayEffect extends BaseContactStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Burn;
  protected readonly chance = 1.0;
  protected readonly immuneTypes = ['ほのお'] as const;
  protected readonly requiresContact = false;
}
