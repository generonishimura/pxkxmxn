import { AbilityRegistry } from './ability-registry';
import { DampEffect } from './effects/other/damp-effect';
import { QueenlyMajestyEffect } from './effects/other/queenly-majesty-effect';
import { DazzlingEffect } from './effects/other/dazzling-effect';
import { ArmorTailEffect } from './effects/other/armor-tail-effect';
import { GoodAsGoldEffect } from './effects/immunity/good-as-gold-effect';

describe('AbilityRegistry（技を出す前に失敗・無効にする特性）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['しめりけ', DampEffect],
    ['じょおうのいげん', QueenlyMajestyEffect],
    ['ビビッドボディ', DazzlingEffect],
    ['テイルアーマー', ArmorTailEffect],
    ['おうごんのからだ', GoodAsGoldEffect],
  ])('%s が DB の特性名で登録されている', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
