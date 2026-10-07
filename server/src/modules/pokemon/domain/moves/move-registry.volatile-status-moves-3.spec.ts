import { MoveRegistry } from './move-registry';
import { EncoreEffect } from './effects/encore-effect';
import { TauntEffect } from './effects/taunt-effect';
import { IngrainEffect } from './effects/ingrain-effect';
import { HealBlockEffect } from './effects/heal-block-effect';
import { AquaRingEffect } from './effects/aqua-ring-effect';
import { MagnetRiseEffect } from './effects/magnet-rise-effect';

describe('MoveRegistry: 一時的な状態を付与する技', () => {
  beforeEach(() => {
    MoveRegistry.initialize();
  });

  it.each([
    ['アンコール', EncoreEffect],
    ['ちょうはつ', TauntEffect],
    ['ねをはる', IngrainEffect],
    ['かいふくふうじ', HealBlockEffect],
    ['アクアリング', AquaRingEffect],
    ['でんじふゆう', MagnetRiseEffect],
  ])('%s に対応する効果クラスが登録されている', (moveName, effectClass) => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
