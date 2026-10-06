import { modifyByFixedPoint } from './fixed-point-modifier';

describe('modifyByFixedPoint', () => {
  it('4096分率の補正を五捨五超入で掛ける（威力80 × 4915/4096 = 96）', () => {
    // Arrange & Act
    const result = modifyByFixedPoint(80, 4915);

    // Assert
    expect(result).toBe(96);
  });

  it('ちょうど0.5の端数は切り捨てる（威力10 × 2048/4096 = 5、威力5 × 6144/4096 = 7）', () => {
    // Arrange & Act
    const half = modifyByFixedPoint(10, 2048);
    const oneAndHalf = modifyByFixedPoint(5, 6144);

    // Assert
    expect(half).toBe(5);
    expect(oneAndHalf).toBe(7);
  });

  it('分母を指定できる（威力60 × 1/4 = 15）', () => {
    // Arrange & Act
    const result = modifyByFixedPoint(60, 1, 4);

    // Assert
    expect(result).toBe(15);
  });
});
