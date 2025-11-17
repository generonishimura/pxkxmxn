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
  いかく: {
    triggerEvent: 'OnEntry',
    effectCategory: 'StatChange',
  },
  マルチスケイル: {
    triggerEvent: 'OnTakingDamage',
    effectCategory: 'DamageModify',
  },
};

const defaultMetadata: AbilityMetadata = {
  triggerEvent: 'Other',
  effectCategory: 'Other',
};

export const getAbilityMetadata = (abilityName: string): AbilityMetadata =>
  abilityMetadataMap[abilityName] ?? defaultMetadata;

