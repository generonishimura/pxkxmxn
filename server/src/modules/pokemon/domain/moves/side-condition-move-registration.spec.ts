import { MoveRegistry } from './move-registry';
import { ReflectEffect } from './effects/reflect-effect';
import { LightScreenEffect } from './effects/light-screen-effect';
import { MudSportEffect } from './effects/mud-sport-effect';
import { WaterSportEffect } from './effects/water-sport-effect';
import { CourtChangeEffect } from './effects/court-change-effect';

describe('MoveRegistry: 壁・どろあそび・みずあそび・コートチェンジの登録', () => {
  beforeEach(() => {
    MoveRegistry.initialize();
  });

  it.each([
    ['リフレクター', ReflectEffect],
    ['ひかりのかべ', LightScreenEffect],
    ['どろあそび', MudSportEffect],
    ['みずあそび', WaterSportEffect],
    ['コートチェンジ', CourtChangeEffect],
  ])('%s が登録されている', (moveName, effectClass) => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
