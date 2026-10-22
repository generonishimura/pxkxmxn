import { MoveRegistry } from '../move-registry';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { ForesightEffect } from './foresight-effect';
import { BaseIdentifyEffect } from './base/base-identify-effect';

describe('ForesightEffect（みやぶる）', () => {
  describe('onUse', () => {
    it('相手に foresight を書き、見破ったメッセージを返す', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();
      const effect = new ForesightEffect();

      // Act
      const result = await effect.onUse(get(1), get(2), context({ moveName: 'みやぶる' }));

      // Assert
      expect(get(2).volatileState.foresight).toBe(true);
      expect(result).toBe('was identified!');
    });

    it('相手がすでに見破られていれば失敗する', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle(
        {},
        { status: { volatileState: { foresight: true } } },
      );
      const effect = new ForesightEffect();

      // Act
      const result = await effect.onUse(get(1), get(2), context({ moveName: 'みやぶる' }));

      // Assert
      expect(battleRepository.patchVolatileState).not.toHaveBeenCalled();
      expect(result).toBe('But it failed');
    });

    it('相手がミラクルアイを受けていれば失敗する（shouldFail。本家の onTryHit）', () => {
      // Arrange
      const { get } = createInMemoryBattle({}, { status: { volatileState: { miracleEye: true } } });
      const effect = new ForesightEffect();

      // Act
      const failed = effect.shouldFail(get(1), get(2));

      // Assert
      expect(failed).toBe(true);
    });
  });

  it('かぎわける・ミラクルアイと同じ基底クラス（BaseIdentifyEffect）を使う', () => {
    // Act
    const effect = new ForesightEffect();

    // Assert
    expect(effect).toBeInstanceOf(BaseIdentifyEffect);
  });

  describe('登録', () => {
    it('「みやぶる」は ForesightEffect として登録されている', () => {
      // Arrange
      MoveRegistry.clear();
      MoveRegistry.initialize();

      // Act
      const effect = MoveRegistry.get('みやぶる');

      // Assert
      expect(effect).toBeInstanceOf(ForesightEffect);
    });
  });
});
