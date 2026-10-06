import { AbilityRegistry } from './ability-registry';
import { TransistorEffect } from './effects/damage-modify/transistor-effect';
import { DragonsMawEffect } from './effects/damage-modify/dragons-maw-effect';
import { RockyPayloadEffect } from './effects/damage-modify/rocky-payload-effect';
import { GrassPeltEffect } from './effects/damage-modify/grass-pelt-effect';
import { IceScalesEffect } from './effects/damage-modify/ice-scales-effect';

describe('AbilityRegistry（ダメージ補正特性: タイプ・天候・HP）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['トランジスタ', TransistorEffect],
    ['りゅうのあぎと', DragonsMawEffect],
    ['いわはこび', RockyPayloadEffect],
    ['くさのけがわ', GrassPeltEffect],
    ['こおりのりんぷん', IceScalesEffect],
  ])('%s が DB の特性名で登録されている', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
