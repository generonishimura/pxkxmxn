import { AbilityRegistry } from '../../ability-registry';
import { NoBattleEffectAbility } from './no-battle-effect-ability';

describe('シングルバトルで効果のない特性の登録', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    // 情報表示のみ・野生バトル専用
    'きけんよち',
    'よちむ',
    'たまひろい',
    // ダブルバトル専用
    'プラス',
    'マイナス',
    'いやしのこころ',
    'フレンドガード',
    'テレパシー',
    'フラワーベール',
    'きょうせい',
    'バッテリー',
    'レシーバー',
    'かがくのちから',
    'スクリューおびれ',
    'すじがねいり',
    'パワースポット',
    'きみょうなくすり',
    'しれいとう',
    'きょうえん',
    'おもてなし',
  ])('%s は共有の NoBattleEffectAbility インスタンスとして登録されている', name => {
    // Arrange
    const shared = AbilityRegistry.get('にげあし');

    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(NoBattleEffectAbility);
    expect(effect).toBe(shared);
  });
});
