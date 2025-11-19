type AbilityTriggerValue =
  | 'OnEntry'
  | 'OnTakingDamage'
  | 'OnDealingDamage'
  | 'OnTurnEnd'
  | 'OnSwitchOut'
  | 'Passive'
  | 'OnStatusCondition'
  | 'Other';

type AbilityCategoryValue =
  | 'StatChange'
  | 'Immunity'
  | 'Weather'
  | 'DamageModify'
  | 'StatusCondition'
  | 'Other';

export interface AbilityMetadata {
  triggerEvent: AbilityTriggerValue;
  effectCategory: AbilityCategoryValue;
}

const abilityMetadataMap: Record<string, AbilityMetadata> = {
  // 既存の特性
  いかく: {
    triggerEvent: 'OnEntry',
    effectCategory: 'StatChange',
  },
  マルチスケイル: {
    triggerEvent: 'OnTakingDamage',
    effectCategory: 'DamageModify',
  },

  // 状態異常無効化系
  ふみん: {
    triggerEvent: 'OnStatusCondition',
    effectCategory: 'Immunity',
  },
  どんかん: {
    triggerEvent: 'OnStatusCondition',
    effectCategory: 'Immunity',
  },

  // タイプ無効化系
  ふゆう: {
    triggerEvent: 'Passive',
    effectCategory: 'Immunity',
  },
  ちくでん: {
    triggerEvent: 'OnTakingDamage',
    effectCategory: 'Immunity',
  },
  もらいび: {
    triggerEvent: 'OnTakingDamage',
    effectCategory: 'Immunity',
  },
  しめりけ: {
    triggerEvent: 'OnTakingDamage',
    effectCategory: 'Immunity',
  },

  // ダメージ修正系
  あついしぼう: {
    triggerEvent: 'OnTakingDamage',
    effectCategory: 'DamageModify',
  },
  はがねつかい: {
    triggerEvent: 'OnDealingDamage',
    effectCategory: 'DamageModify',
  },

  // ステータス変化系
  すいすい: {
    triggerEvent: 'Passive',
    effectCategory: 'StatChange',
  },
  ようりょくそ: {
    triggerEvent: 'Passive',
    effectCategory: 'StatChange',
  },
  すなかき: {
    triggerEvent: 'Passive',
    effectCategory: 'StatChange',
  },

  // 天候系
  あめふらし: {
    triggerEvent: 'OnEntry',
    effectCategory: 'Weather',
  },
  ひでり: {
    triggerEvent: 'OnEntry',
    effectCategory: 'Weather',
  },
  すなあらし: {
    triggerEvent: 'OnEntry',
    effectCategory: 'Weather',
  },
  ゆきふらし: {
    triggerEvent: 'OnEntry',
    effectCategory: 'Weather',
  },
};

const defaultMetadata: AbilityMetadata = {
  triggerEvent: 'Other',
  effectCategory: 'Other',
};

export const getAbilityMetadata = (abilityName: string): AbilityMetadata =>
  abilityMetadataMap[abilityName] ?? defaultMetadata;

