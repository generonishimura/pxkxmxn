import { BaseTypeDependentDamageDealtEffect } from '../base/base-type-dependent-damage-dealt-effect';

/**
 * Fire Mane 特性の効果（メガカエンジシ）
 * ほのおタイプの技の威力を 1.5 倍にする
 * 本家（Pokemon Showdown）は、りゅうのあぎとと同じく攻撃・特攻を 1.5 倍にする。
 * このエンジンでは、りゅうのあぎとと同じ BaseTypeDependentDamageDealtEffect で扱う
 *
 * 注: 日本語名が DB にないため、英語名の Fire Mane で登録する
 */
export class FireManeEffect extends BaseTypeDependentDamageDealtEffect {
  protected readonly affectedTypes = ['ほのお'] as const;
  protected readonly damageMultiplier = 1.5;
}
