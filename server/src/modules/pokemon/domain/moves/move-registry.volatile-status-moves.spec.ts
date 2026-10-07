import { MoveRegistry } from './move-registry';
import { StockpileEffect } from './effects/stockpile-effect';
import { PowerTrickEffect } from './effects/power-trick-effect';
import { OdorSleuthEffect } from './effects/odor-sleuth-effect';
import { MiracleEyeEffect } from './effects/miracle-eye-effect';
import { TarShotEffect } from './effects/tar-shot-effect';
import { OctolockEffect } from './effects/octolock-effect';

describe('MoveRegistry: 一時的な状態を書く技', () => {
  beforeEach(() => {
    MoveRegistry.initialize();
  });

  it.each([
    ['たくわえる', StockpileEffect],
    ['パワートリック', PowerTrickEffect],
    ['かぎわける', OdorSleuthEffect],
    ['ミラクルアイ', MiracleEyeEffect],
    ['タールショット', TarShotEffect],
    ['たこがため', OctolockEffect],
  ])('%s に対応する効果クラスが登録されている', (moveName, effectClass) => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
