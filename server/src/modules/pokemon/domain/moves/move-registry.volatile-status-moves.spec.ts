import { MoveRegistry } from './move-registry';
import { StockpileEffect } from './effects/stockpile-effect';
import { PowerTrickEffect } from './effects/power-trick-effect';

describe('MoveRegistry: 一時的な状態を書く技', () => {
  beforeEach(() => {
    MoveRegistry.initialize();
  });

  it.each([
    ['たくわえる', StockpileEffect],
    ['パワートリック', PowerTrickEffect],
  ])('%s に対応する効果クラスが登録されている', (moveName, effectClass) => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
