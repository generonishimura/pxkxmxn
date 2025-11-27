import { ValidationException } from '../../../../shared/domain/exceptions/validation.exception';

/**
 * AbilityTrigger: 特性の発動タイミング
 */
export enum AbilityTrigger {
  OnEntry = 'OnEntry',
  OnTakingDamage = 'OnTakingDamage',
  OnDealingDamage = 'OnDealingDamage',
  OnTurnEnd = 'OnTurnEnd',
  OnSwitchOut = 'OnSwitchOut',
  Passive = 'Passive',
  OnStatusCondition = 'OnStatusCondition',
  Other = 'Other',
}

/**
 * AbilityCategory: 特性効果の分類
 */
export enum AbilityCategory {
  StatChange = 'StatChange',
  Immunity = 'Immunity',
  Weather = 'Weather',
  DamageModify = 'DamageModify',
  StatusCondition = 'StatusCondition',
  Other = 'Other',
}

/**
 * Abilityエンティティ
 * 特性のドメインエンティティ
 *
 * 注意: ロジックそのもの（例: 「HPが満タンならダメージ半減」）は含まれない。
 * nameフィールドをキーとして、アプリケーション側でロジックを管理する。
 */
export class Ability {
  /**
   * 最小ID値
   */
  private static readonly MIN_ID = 1;

  constructor(
    public readonly id: number,
    public readonly name: string, // アプリケーション側でロジックを識別するキー
    public readonly nameEn: string,
    public readonly description: string,
    public readonly triggerEvent: AbilityTrigger, // ロジックの発動タイミング（補助フラグ）
    public readonly effectCategory: AbilityCategory // 効果の大まかな分類（補助フラグ）
  ) {
    // IDのバリデーション
    if (id < Ability.MIN_ID) {
      throw new ValidationException(
        `Ability ID must be at least ${Ability.MIN_ID}. Got: ${id}`,
        'id',
      );
    }

    // 名前のバリデーション
    if (!name || name.trim().length === 0) {
      throw new ValidationException(
        'Ability name must not be empty',
        'name',
      );
    }

    if (!nameEn || nameEn.trim().length === 0) {
      throw new ValidationException(
        'Ability nameEn must not be empty',
        'nameEn',
      );
    }

    // 説明のバリデーション
    if (!description || description.trim().length === 0) {
      throw new ValidationException(
        'Ability description must not be empty',
        'description',
      );
    }
  }
}
