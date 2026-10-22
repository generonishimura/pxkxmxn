import { PerishBodyEffect } from './perish-body-effect';
import { HitResult } from '../../../battle-events/hit-result';
import { AbilityRegistry } from '../../ability-registry';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('PerishBodyEffect（ほろびのボディ）', () => {
  const createHit = (isContact: boolean, targetFainted = false): HitResult => ({
    damage: 10,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact,
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

  describe('onDamagingHit', () => {
    it('接触技を受けたとき、自分と攻撃側の両方に perishCount 3 を書く', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { ability: 'ほろびのボディ' });

      // Act
      const message = await new PerishBodyEffect().onDamagingHit(
        get(2),
        get(1),
        createHit(true),
        context(),
      );

      // Assert
      expect(message).toBe('ほろびのボディ activated!');
      expect(get(1).volatileState.perishCount).toBe(3);
      expect(get(2).volatileState.perishCount).toBe(3);
    });

    it('接触しない技では何もしない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { ability: 'ほろびのボディ' });

      // Act
      const message = await new PerishBodyEffect().onDamagingHit(
        get(2),
        get(1),
        createHit(false),
        context(),
      );

      // Assert
      expect(message).toBeNull();
      expect(get(1).volatileState.perishCount).toBeUndefined();
      expect(get(2).volatileState.perishCount).toBeUndefined();
    });

    it('攻撃側がすでにカウントを持っていれば、自分にも付けない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { status: { volatileState: { perishCount: 2 } } },
        { ability: 'ほろびのボディ' },
      );

      // Act
      const message = await new PerishBodyEffect().onDamagingHit(
        get(2),
        get(1),
        createHit(true),
        context(),
      );

      // Assert
      expect(message).toBeNull();
      expect(get(1).volatileState.perishCount).toBe(2);
      expect(get(2).volatileState.perishCount).toBeUndefined();
    });

    it('自分だけがすでにカウントを持っていれば、攻撃側にだけ付ける', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'ほろびのボディ', status: { volatileState: { perishCount: 1 } } },
      );

      // Act
      const message = await new PerishBodyEffect().onDamagingHit(
        get(2),
        get(1),
        createHit(true),
        context(),
      );

      // Assert
      expect(message).toBe('ほろびのボディ activated!');
      expect(get(1).volatileState.perishCount).toBe(3);
      expect(get(2).volatileState.perishCount).toBe(1);
    });

    it('このヒットで自分がひんしになっても、攻撃側には付ける', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'ほろびのボディ', status: { currentHp: 0 } },
      );

      // Act
      const message = await new PerishBodyEffect().onDamagingHit(
        get(2),
        get(1),
        createHit(true, true),
        context(),
      );

      // Assert
      expect(message).toBe('ほろびのボディ activated!');
      expect(get(1).volatileState.perishCount).toBe(3);
      expect(get(2).volatileState.perishCount).toBeUndefined();
    });
  });
});
