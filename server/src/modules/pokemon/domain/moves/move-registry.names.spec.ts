import { MoveRegistry } from './move-registry';
import { ThunderboltEffect } from './effects/thunderbolt-effect';
import { RainDanceEffect } from './effects/rain-dance-effect';

describe('MoveRegistry: 登録キーが DB の技名（PokeAPI の ja-Hrkt 名）と一致する', () => {
  beforeEach(() => {
    MoveRegistry.initialize();
  });

  it.each([
    ['１０まんボルト', ThunderboltEffect],
    ['あまごい', RainDanceEffect],
  ])('%s が登録されている', (moveName, effectClass) => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });

  it.each(['10まんボルト', 'あめをよぶ'])('存在しない技名 %s は登録されていない', moveName => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeUndefined();
  });
});
