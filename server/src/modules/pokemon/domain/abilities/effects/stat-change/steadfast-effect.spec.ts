import { SteadfastEffect } from './steadfast-effect';
import { AbilityRegistry } from '../../ability-registry';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('SteadfastEffect（ふくつのこころ）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('onFlinch', () => {
    it('ひるんで動けなかったら、素早さを1段階上げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'ふくつのこころ' });

      // Act
      const message = await new SteadfastEffect().onFlinch(get(1), context());

      // Assert
      expect(get(1).speedRank).toBe(1);
      expect(message).toBe('Speed rose!');
    });

    it('素早さランクが+6なら、ランクは変わらない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        ability: 'ふくつのこころ',
        status: { speedRank: 6 },
      });

      // Act
      const message = await new SteadfastEffect().onFlinch(get(1), context());

      // Assert
      expect(get(1).speedRank).toBe(6);
      expect(message).toBeNull();
    });

    it('コンテキストがなければ、何もしない', async () => {
      // Arrange
      const { get } = createInMemoryBattle({ ability: 'ふくつのこころ' });

      // Act
      const message = await new SteadfastEffect().onFlinch(get(1));

      // Assert
      expect(get(1).speedRank).toBe(0);
      expect(message).toBeNull();
    });
  });

  it('AbilityRegistryに「ふくつのこころ」として登録されている', () => {
    // Arrange
    // （beforeEach でレジストリを初期化済み）

    // Act
    const effect = AbilityRegistry.get('ふくつのこころ');

    // Assert
    expect(effect).toBeInstanceOf(SteadfastEffect);
  });
});
