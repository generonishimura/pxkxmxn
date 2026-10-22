import { CottonDownEffect } from './cotton-down-effect';
import { AbilityRegistry } from '../../ability-registry';
import { HitResult } from '../../../battle-events/hit-result';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('CottonDownEffect（わたげ）', () => {
  const hit = (targetFainted = false): HitResult => ({
    damage: 30,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact: true,
    moveTypeName: 'ノーマル',
    moveCategory: 'Physical',
    targetFainted,
  });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('わたげ として登録されている', () => {
    // Arrange & Act
    const effect = AbilityRegistry.get('わたげ');

    // Assert
    expect(effect).toBeInstanceOf(CottonDownEffect);
  });

  describe('onDamagingHit', () => {
    it('攻撃技を受けたら、攻撃してきた相手の素早さを1段階下げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { ability: 'わたげ' });

      // Act
      const message = await new CottonDownEffect().onDamagingHit(get(2), get(1), hit(), context());

      // Assert
      expect(get(1).speedRank).toBe(-1);
      expect(get(2).speedRank).toBe(0);
      expect(message).toBe('Speed fell!');
    });

    it('自分がひんしになったヒットでも、相手の素早さを下げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'わたげ', status: { currentHp: 0 } },
      );

      // Act
      await new CottonDownEffect().onDamagingHit(get(2), get(1), hit(true), context());

      // Assert
      expect(get(1).speedRank).toBe(-1);
    });

    it('相手がクリアボディなら、素早さは下がらない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'クリアボディ' },
        { ability: 'わたげ' },
      );

      // Act
      const message = await new CottonDownEffect().onDamagingHit(get(2), get(1), hit(), context());

      // Assert
      expect(get(1).speedRank).toBe(0);
      expect(message).toBeNull();
    });

    it('相手の素早さランクが-6なら、ランクは変わらない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { status: { speedRank: -6 } },
        { ability: 'わたげ' },
      );

      // Act
      const message = await new CottonDownEffect().onDamagingHit(get(2), get(1), hit(), context());

      // Assert
      expect(get(1).speedRank).toBe(-6);
      expect(message).toBeNull();
    });

    it('コンテキストがなければ何もしない', async () => {
      // Arrange
      const { get } = createInMemoryBattle({}, { ability: 'わたげ' });

      // Act
      const message = await new CottonDownEffect().onDamagingHit(get(2), get(1), hit());

      // Assert
      expect(get(1).speedRank).toBe(0);
      expect(message).toBeNull();
    });
  });
});
