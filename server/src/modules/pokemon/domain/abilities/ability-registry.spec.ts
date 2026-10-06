import { AbilityRegistry } from './ability-registry';
import { MarvelScaleEffect } from './effects/damage-modify/marvel-scale-effect';
import { SandStreamEffect } from './effects/weather/sand-stream-effect';
import { SlushRushEffect } from './effects/stat-change/slush-rush-effect';
import { PoisonPointEffect } from './effects/stat-change/poison-point-effect';
import { FlameBodyEffect } from './effects/stat-change/flame-body-effect';
import { ClearBodyEffect } from './effects/stat-change/clear-body-effect';
import { NoBattleEffectAbility } from './effects/other/no-battle-effect-ability';

describe('AbilityRegistry', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('登録キーが DB の特性名（PokeAPI の ja-Hrkt 名）と一致する', () => {
    // DB の Ability.name は PokeAPI の ja-Hrkt 名で seed される。
    // キーがずれると AbilityRegistry.get() が undefined を返し、特性がバトルで発動しない。
    it.each([
      ['ふしぎなうろこ', MarvelScaleEffect],
      ['すなおこし', SandStreamEffect],
      ['ゆきかき', SlushRushEffect],
      ['どくのトゲ', PoisonPointEffect],
      ['ほのおのからだ', FlameBodyEffect],
      ['しろいけむり', ClearBodyEffect],
      ['みつあつめ', NoBattleEffectAbility],
    ])('%s が登録されている', (name, effectClass) => {
      expect(AbilityRegistry.get(name)).toBeInstanceOf(effectClass);
    });

    it.each([
      'ふしぎなウロコ',
      'すなあらし',
      'ゆきがき',
      'どくどく',
      'もうふう',
      'ホワイトスモーク',
      'ハッピータイム',
    ])('存在しない特性名 %s は登録されていない', name => {
      expect(AbilityRegistry.get(name)).toBeUndefined();
    });
  });
});
