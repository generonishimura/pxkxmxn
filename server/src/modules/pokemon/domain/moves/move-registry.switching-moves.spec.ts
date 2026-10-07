import { MoveRegistry } from './move-registry';
import { MeanLookEffect } from './effects/mean-look-effect';
import { BlockEffect } from './effects/block-effect';
import { SpiderWebEffect } from './effects/spider-web-effect';
import { ShedTailEffect } from './effects/shed-tail-effect';
import { ChillyReceptionEffect } from './effects/chilly-reception-effect';
import { LunarDanceEffect } from './effects/lunar-dance-effect';

describe('MoveRegistry: 逃げられなくする技・交代する技の登録', () => {
  beforeEach(() => {
    MoveRegistry.initialize();
  });

  it.each([
    ['くろいまなざし', MeanLookEffect],
    ['とおせんぼう', BlockEffect],
    ['クモのす', SpiderWebEffect],
    ['しっぽきり', ShedTailEffect],
    ['さむいギャグ', ChillyReceptionEffect],
    ['みかづきのまい', LunarDanceEffect],
  ])('%s が登録されている', (moveName, effectClass) => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
