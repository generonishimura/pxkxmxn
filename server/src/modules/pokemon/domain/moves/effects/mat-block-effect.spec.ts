import { MatBlockEffect } from './mat-block-effect';
import { keepsProtectCount } from '@/modules/battle/domain/logic/protection';

describe('MatBlockEffect', () => {
  it('自分の陣営にたたみがえしを張る守りの技である', () => {
    // Arrange
    const effect = new MatBlockEffect();

    // Act
    const protection = effect.protection;

    // Assert
    expect(protection).toEqual({ side: 'matBlock' });
  });

  it('使ったあと、まもる系を続けた回数を残さない', () => {
    // Arrange
    const effect = new MatBlockEffect();

    // Act
    const keeps = keepsProtectCount(effect);

    // Assert
    expect(keeps).toBe(false);
  });
});
