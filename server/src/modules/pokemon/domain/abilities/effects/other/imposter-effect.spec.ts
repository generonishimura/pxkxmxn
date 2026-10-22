import { ImposterEffect } from './imposter-effect';
import { AbilityRegistry } from '../../ability-registry';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('ImposterEffect（かわりもの）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('かわりもの として登録されている', () => {
    // Arrange & Act
    const effect = AbilityRegistry.get('かわりもの');

    // Assert
    expect(effect).toBeInstanceOf(ImposterEffect);
  });

  describe('onEntry', () => {
    it('場に出たら、相手の場のポケモンにへんしんする', async () => {
      // Arrange
      const battle = createInMemoryBattle(
        { ability: 'かわりもの', types: ['ノーマル'] },
        { ability: 'ふみん', types: ['ゴースト', 'どく'], status: { speedRank: 1 } },
      );

      // Act
      await new ImposterEffect().onEntry(battle.get(1), battle.context());

      // Assert
      const holder = battle.get(1);
      expect(holder.volatileState.transformedIntoStatusId).toBe(2);
      expect(holder.volatileState.typeOverride).toEqual(['ゴースト', 'どく']);
      expect(holder.volatileState.abilityOverride).toBe('ふみん');
      expect(holder.speedRank).toBe(1);
    });

    it('相手のいかくを写すと、写したいかくが発動する', async () => {
      // Arrange
      const battle = createInMemoryBattle({ ability: 'かわりもの' }, { ability: 'いかく' });

      // Act
      await new ImposterEffect().onEntry(battle.get(1), battle.context());

      // Assert
      expect(battle.get(1).volatileState.abilityOverride).toBe('いかく');
      expect(battle.get(2).attackRank).toBe(-1);
    });

    it('相手がみがわり中なら、へんしんしない', async () => {
      // Arrange
      const battle = createInMemoryBattle(
        { ability: 'かわりもの' },
        { status: { volatileState: { substituteHp: 25 } } },
      );

      // Act
      await new ImposterEffect().onEntry(battle.get(1), battle.context());

      // Assert
      expect(battle.get(1).volatileState.transformedIntoStatusId).toBeUndefined();
    });

    it('相手の場のポケモンがひんしなら、へんしんしない', async () => {
      // Arrange
      const battle = createInMemoryBattle({ ability: 'かわりもの' }, { status: { currentHp: 0 } });

      // Act
      await new ImposterEffect().onEntry(battle.get(1), battle.context());

      // Assert
      expect(battle.get(1).volatileState.transformedIntoStatusId).toBeUndefined();
    });

    it('コンテキストがなければ何もしない', async () => {
      // Arrange
      const battle = createInMemoryBattle({ ability: 'かわりもの' });

      // Act
      await new ImposterEffect().onEntry(battle.get(1));

      // Assert
      expect(battle.get(1).volatileState.transformedIntoStatusId).toBeUndefined();
    });
  });
});
