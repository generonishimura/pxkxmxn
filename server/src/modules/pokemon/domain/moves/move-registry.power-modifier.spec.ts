import { MoveRegistry } from './move-registry';
import { VenoshockEffect } from './effects/venoshock-effect';
import { HexEffect } from './effects/hex-effect';
import { StoredPowerEffect } from './effects/stored-power-effect';
import { WeatherBallEffect } from './effects/weather-ball-effect';

describe('MoveRegistry: 威力・タイプが変わる技', () => {
  beforeEach(() => {
    MoveRegistry.initialize();
  });

  it.each([
    ['ベノムショック', VenoshockEffect],
    ['たたりめ', HexEffect],
    ['アシストパワー', StoredPowerEffect],
    ['ウェザーボール', WeatherBallEffect],
  ])('%s に対応する効果クラスが登録されている', (moveName, effectClass) => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
