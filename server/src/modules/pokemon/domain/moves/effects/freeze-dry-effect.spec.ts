import { IMoveEffect } from '../move-effect.interface';
import { FreezeDryEffect } from './freeze-dry-effect';

describe('FreezeDryEffect（フリーズドライ）', () => {
  it('みずタイプへの相性を 2 倍に上書きする', () => {
    // Arrange
    const effect: IMoveEffect = new FreezeDryEffect();

    // Act
    const overrides = effect.typeEffectivenessOverrides;

    // Assert
    expect(overrides).toEqual({ みず: 2 });
  });

  it('こおりにする追加効果はない（チャンピオンズ。SV は 10%）', () => {
    // Arrange
    const effect: IMoveEffect = new FreezeDryEffect();

    // Act
    const onHit = effect.onHit;

    // Assert
    expect(onHit).toBeUndefined();
  });
});
