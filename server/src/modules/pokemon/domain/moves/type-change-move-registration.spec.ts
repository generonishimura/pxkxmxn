import { MoveRegistry } from './move-registry';
import { ElectrifyEffect } from './effects/electrify-effect';
import { RoostEffect } from './effects/roost-effect';
import { ConversionEffect } from './effects/conversion-effect';
import { Conversion2Effect } from './effects/conversion2-effect';
import { SoakEffect } from './effects/soak-effect';

describe('タイプを変える技の登録', () => {
  beforeAll(() => {
    MoveRegistry.initialize();
  });

  it.each([
    ['そうでん', ElectrifyEffect],
    ['はねやすめ', RoostEffect],
    ['テクスチャー', ConversionEffect],
    ['テクスチャー２', Conversion2Effect],
    ['みずびたし', SoakEffect],
  ])('%s が登録されている', (name, effectClass) => {
    // Act
    const effect = MoveRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
