import { MoveRegistry } from './move-registry';
import { GravityEffect } from './effects/gravity-effect';
import { GrassyTerrainEffect } from './effects/grassy-terrain-effect';
import { RevivalBlessingEffect } from './effects/revival-blessing-effect';
import { TrickRoomEffect } from './effects/trick-room-effect';
import { WonderRoomEffect } from './effects/wonder-room-effect';

describe('場の状態を変える技・さいきのいのりの登録', () => {
  beforeAll(() => {
    MoveRegistry.initialize();
  });

  it.each([
    ['さいきのいのり', RevivalBlessingEffect],
    ['じゅうりょく', GravityEffect],
    ['トリックルーム', TrickRoomEffect],
    ['ワンダールーム', WonderRoomEffect],
    ['グラスフィールド', GrassyTerrainEffect],
  ])('%s が登録されている', (name, effectClass) => {
    // Act
    const effect = MoveRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });
});
