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
  constructor(
    public readonly id: number,
    public readonly name: string, // アプリケーション側でロジックを識別するキー
    public readonly nameEn: string,
    public readonly description: string,
    public readonly triggerEvent: AbilityTrigger, // ロジックの発動タイミング（補助フラグ）
    public readonly effectCategory: AbilityCategory // 効果の大まかな分類（補助フラグ）
  ) {}
}
