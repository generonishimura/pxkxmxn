import { SoulHeartEffect } from './soul-heart-effect';
import { AbilityRegistry } from '../../ability-registry';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('SoulHeartEffect（ソウルハート）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('onKnockOut', () => {
    it('自分の技で相手をひんしにしたら、特攻を1段階上げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'ソウルハート' },
        { status: { currentHp: 0 } },
      );

      // Act
      const message = await new SoulHeartEffect().onKnockOut(get(1), get(2), context());

      // Assert
      expect(get(1).specialAttackRank).toBe(1);
      expect(message).toBe('Special Attack rose!');
    });

    it('特攻ランクが+6なら、ランクは変わらない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'ソウルハート', status: { specialAttackRank: 6 } },
        { status: { currentHp: 0 } },
      );

      // Act
      const message = await new SoulHeartEffect().onKnockOut(get(1), get(2), context());

      // Assert
      expect(get(1).specialAttackRank).toBe(6);
      expect(message).toBeNull();
    });
  });

  it('AbilityRegistryに「ソウルハート」として登録されている', () => {
    // Arrange
    // （beforeEach でレジストリを初期化済み）

    // Act
    const effect = AbilityRegistry.get('ソウルハート');

    // Assert
    expect(effect).toBeInstanceOf(SoulHeartEffect);
  });
});
