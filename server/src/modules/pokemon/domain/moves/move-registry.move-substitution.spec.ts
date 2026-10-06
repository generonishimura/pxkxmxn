import { MoveRegistry } from './move-registry';
import { MimicEffect } from './effects/mimic-effect';
import { SketchEffect } from './effects/sketch-effect';
import { MetronomeEffect } from './effects/metronome-effect';

describe('MoveRegistry: ほかの技をまねる・呼ぶ技の登録', () => {
  beforeAll(() => {
    MoveRegistry.initialize();
  });

  it.each([
    ['ものまね', MimicEffect],
    ['スケッチ', SketchEffect],
    ['ゆびをふる', MetronomeEffect],
  ])('%s が登録されている', (moveName, effectClass) => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
