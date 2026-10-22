import { YawnEffect } from './yawn-effect';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('YawnEffect（あくび）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('onUse', () => {
    it('相手に yawnTurns 2 を書き、次のターンの終わりに眠るようにする', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const message = await new YawnEffect().onUse(get(1), get(2), context({ moveName: 'あくび' }));

      // Assert
      expect(message).toBe('made the target drowsy!');
      expect(get(2).volatileState.yawnTurns).toBe(2);
    });

    it('相手が状態異常なら失敗する', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { status: { statusCondition: StatusCondition.Paralysis } },
      );

      // Act
      const message = await new YawnEffect().onUse(get(1), get(2), context({ moveName: 'あくび' }));

      // Assert
      expect(message).toBe('But it failed');
      expect(get(2).volatileState.yawnTurns).toBeUndefined();
    });

    it('相手がすでにねむけ状態なら失敗し、残りターン数は変わらない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { status: { volatileState: { yawnTurns: 1 } } },
      );

      // Act
      const message = await new YawnEffect().onUse(get(1), get(2), context({ moveName: 'あくび' }));

      // Assert
      expect(message).toBe('But it failed');
      expect(get(2).volatileState.yawnTurns).toBe(1);
    });

    it('相手の特性が ふみん なら失敗する', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { ability: 'ふみん' });

      // Act
      const message = await new YawnEffect().onUse(get(1), get(2), context({ moveName: 'あくび' }));

      // Assert
      expect(message).toBe('But it failed');
      expect(get(2).volatileState.yawnTurns).toBeUndefined();
    });

    it('使い手が かたやぶり なら、相手の ふみん を無視して付与する', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'かたやぶり' },
        { ability: 'ふみん' },
      );

      // Act
      const message = await new YawnEffect().onUse(
        get(1),
        get(2),
        context({ moveName: 'あくび', attackerAbilityName: 'かたやぶり' }),
      );

      // Assert
      expect(message).toBe('made the target drowsy!');
      expect(get(2).volatileState.yawnTurns).toBe(2);
    });
  });
});
