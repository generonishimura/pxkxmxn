import { getAbilityMetadata, AbilityMetadata } from '../../../prisma/seed-utils/ability-mapping';

describe('ability-mapping', () => {
  describe('getAbilityMetadata', () => {
    it('should return correct metadata for existing abilities', () => {
      // 既存の特性
      expect(getAbilityMetadata('いかく')).toEqual({
        triggerEvent: 'OnEntry',
        effectCategory: 'StatChange',
      });

      expect(getAbilityMetadata('マルチスケイル')).toEqual({
        triggerEvent: 'OnTakingDamage',
        effectCategory: 'DamageModify',
      });
    });

    it('should return correct metadata for state condition immunity abilities', () => {
      // 状態異常無効化系
      expect(getAbilityMetadata('ふみん')).toEqual({
        triggerEvent: 'OnStatusCondition',
        effectCategory: 'Immunity',
      });

      expect(getAbilityMetadata('どんかん')).toEqual({
        triggerEvent: 'OnStatusCondition',
        effectCategory: 'Immunity',
      });
    });

    it('should return correct metadata for type immunity abilities', () => {
      // タイプ無効化系
      expect(getAbilityMetadata('ふゆう')).toEqual({
        triggerEvent: 'Passive',
        effectCategory: 'Immunity',
      });

      expect(getAbilityMetadata('ちくでん')).toEqual({
        triggerEvent: 'OnTakingDamage',
        effectCategory: 'Immunity',
      });

      expect(getAbilityMetadata('もらいび')).toEqual({
        triggerEvent: 'OnTakingDamage',
        effectCategory: 'Immunity',
      });

      expect(getAbilityMetadata('しめりけ')).toEqual({
        triggerEvent: 'OnTakingDamage',
        effectCategory: 'Immunity',
      });
    });

    it('should return correct metadata for damage modify abilities', () => {
      // ダメージ修正系
      expect(getAbilityMetadata('あついしぼう')).toEqual({
        triggerEvent: 'OnTakingDamage',
        effectCategory: 'DamageModify',
      });

      expect(getAbilityMetadata('はがねつかい')).toEqual({
        triggerEvent: 'OnDealingDamage',
        effectCategory: 'DamageModify',
      });
    });

    it('should return correct metadata for stat change abilities', () => {
      // ステータス変化系
      expect(getAbilityMetadata('すいすい')).toEqual({
        triggerEvent: 'Passive',
        effectCategory: 'StatChange',
      });

      expect(getAbilityMetadata('ようりょくそ')).toEqual({
        triggerEvent: 'Passive',
        effectCategory: 'StatChange',
      });

      expect(getAbilityMetadata('すなかき')).toEqual({
        triggerEvent: 'Passive',
        effectCategory: 'StatChange',
      });
    });

    it('should return correct metadata for weather abilities', () => {
      // 天候系
      expect(getAbilityMetadata('あめふらし')).toEqual({
        triggerEvent: 'OnEntry',
        effectCategory: 'Weather',
      });

      expect(getAbilityMetadata('ひでり')).toEqual({
        triggerEvent: 'OnEntry',
        effectCategory: 'Weather',
      });

      expect(getAbilityMetadata('すなあらし')).toEqual({
        triggerEvent: 'OnEntry',
        effectCategory: 'Weather',
      });

      expect(getAbilityMetadata('ゆきふらし')).toEqual({
        triggerEvent: 'OnEntry',
        effectCategory: 'Weather',
      });
    });

    it('should return default metadata for unknown abilities', () => {
      // 未知の特性はデフォルト値を返す
      expect(getAbilityMetadata('未知の特性')).toEqual({
        triggerEvent: 'Other',
        effectCategory: 'Other',
      });

      expect(getAbilityMetadata('')).toEqual({
        triggerEvent: 'Other',
        effectCategory: 'Other',
      });
    });

    it('should return valid metadata structure for all mapped abilities', () => {
      // すべてのマッピングされた特性が正しい構造を持っていることを確認
      const mappedAbilities = [
        'いかく',
        'マルチスケイル',
        'ふみん',
        'どんかん',
        'ふゆう',
        'ちくでん',
        'もらいび',
        'しめりけ',
        'あついしぼう',
        'はがねつかい',
        'すいすい',
        'ようりょくそ',
        'すなかき',
        'あめふらし',
        'ひでり',
        'すなあらし',
        'ゆきふらし',
      ];

      mappedAbilities.forEach(abilityName => {
        const metadata = getAbilityMetadata(abilityName);
        expect(metadata).toBeDefined();
        expect(metadata).toHaveProperty('triggerEvent');
        expect(metadata).toHaveProperty('effectCategory');
        expect(typeof metadata.triggerEvent).toBe('string');
        expect(typeof metadata.effectCategory).toBe('string');
      });
    });

    it('should have valid triggerEvent values', () => {
      // triggerEventが有効な値であることを確認
      const validTriggerEvents = [
        'OnEntry',
        'OnTakingDamage',
        'OnDealingDamage',
        'OnTurnEnd',
        'OnSwitchOut',
        'Passive',
        'OnStatusCondition',
        'Other',
      ];

      const mappedAbilities = [
        'いかく',
        'マルチスケイル',
        'ふみん',
        'どんかん',
        'ふゆう',
        'ちくでん',
        'もらいび',
        'しめりけ',
        'あついしぼう',
        'はがねつかい',
        'すいすい',
        'ようりょくそ',
        'すなかき',
        'あめふらし',
        'ひでり',
        'すなあらし',
        'ゆきふらし',
      ];

      mappedAbilities.forEach(abilityName => {
        const metadata = getAbilityMetadata(abilityName);
        expect(validTriggerEvents).toContain(metadata.triggerEvent);
      });
    });

    it('should have valid effectCategory values', () => {
      // effectCategoryが有効な値であることを確認
      const validEffectCategories = [
        'StatChange',
        'Immunity',
        'Weather',
        'DamageModify',
        'StatusCondition',
        'Other',
      ];

      const mappedAbilities = [
        'いかく',
        'マルチスケイル',
        'ふみん',
        'どんかん',
        'ふゆう',
        'ちくでん',
        'もらいび',
        'しめりけ',
        'あついしぼう',
        'はがねつかい',
        'すいすい',
        'ようりょくそ',
        'すなかき',
        'あめふらし',
        'ひでり',
        'すなあらし',
        'ゆきふらし',
      ];

      mappedAbilities.forEach(abilityName => {
        const metadata = getAbilityMetadata(abilityName);
        expect(validEffectCategories).toContain(metadata.effectCategory);
      });
    });
  });
});

