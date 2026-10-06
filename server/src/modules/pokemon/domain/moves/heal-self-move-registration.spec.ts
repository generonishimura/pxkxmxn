import { MoveRegistry } from './move-registry';
import { BaseSelfHealEffect } from './effects/base/base-self-heal-effect';
import { BaseWeatherSelfHealEffect } from './effects/base/base-weather-self-heal-effect';
import { ShoreUpEffect } from './effects/shore-up-effect';

describe('HP回復技（自分を回復）の登録', () => {
  beforeAll(() => {
    MoveRegistry.initialize();
  });

  it.each(['じこさいせい', 'タマゴうみ', 'ミルクのみ', 'なまける', 'かいふくしれい'])(
    '%s は自分の HP を回復する技として登録されている',
    name => {
      // Act
      const effect = MoveRegistry.get(name);

      // Assert
      expect(effect).toBeInstanceOf(BaseSelfHealEffect);
      expect(effect).not.toBeInstanceOf(BaseWeatherSelfHealEffect);
    },
  );

  it.each(['あさのひざし', 'こうごうせい', 'つきのひかり'])(
    '%s は天候で回復量が変わる技として登録されている',
    name => {
      // Act
      const effect = MoveRegistry.get(name);

      // Assert
      expect(effect).toBeInstanceOf(BaseWeatherSelfHealEffect);
    },
  );

  it('すなあつめ はすなあらしで回復量が増える技として登録されている', () => {
    // Act
    const effect = MoveRegistry.get('すなあつめ');

    // Assert
    expect(effect).toBeInstanceOf(ShoreUpEffect);
  });
});
