import { PerishSongEffect } from './perish-song-effect';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { BattleContext } from '../../abilities/battle-context.interface';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('PerishSongEffect（ほろびのうた）', () => {
  const songContext: Partial<BattleContext> = {
    moveName: 'ほろびのうた',
    moveCategory: 'Status',
    moveFlags: new Set(['sound']),
  };

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('onUse', () => {
    it('自分と相手の両方に perishCount 3 を書く', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const message = await new PerishSongEffect().onUse(get(1), get(2), context(songContext));

      // Assert
      expect(message).toBe('All Pokemon hearing the song will faint in three turns!');
      expect(get(1).volatileState.perishCount).toBe(3);
      expect(get(2).volatileState.perishCount).toBe(3);
    });

    it('すでにカウントがあるポケモンのカウントは変えない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        status: { volatileState: { perishCount: 1 } },
      });

      // Act
      await new PerishSongEffect().onUse(get(1), get(2), context(songContext));

      // Assert
      expect(get(1).volatileState.perishCount).toBe(1);
      expect(get(2).volatileState.perishCount).toBe(3);
    });

    it('両者ともすでにカウントがあれば失敗する', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { status: { volatileState: { perishCount: 2 } } },
        { status: { volatileState: { perishCount: 1 } } },
      );

      // Act
      const message = await new PerishSongEffect().onUse(get(1), get(2), context(songContext));

      // Assert
      expect(message).toBe('But it failed');
      expect(get(1).volatileState.perishCount).toBe(2);
      expect(get(2).volatileState.perishCount).toBe(1);
    });

    it('相手の特性が ぼうおん なら、相手には付かず自分にだけ付く', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { ability: 'ぼうおん' });

      // Act
      const message = await new PerishSongEffect().onUse(
        get(1),
        get(2),
        context({ ...songContext, defenderAbilityName: 'ぼうおん' }),
      );

      // Assert
      expect(message).toBe('All Pokemon hearing the song will faint in three turns!');
      expect(get(1).volatileState.perishCount).toBe(3);
      expect(get(2).volatileState.perishCount).toBeUndefined();
    });

    it('自分にカウントがあり、相手が ぼうおん でも失敗にはならない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { status: { volatileState: { perishCount: 2 } } },
        { ability: 'ぼうおん' },
      );

      // Act
      const message = await new PerishSongEffect().onUse(
        get(1),
        get(2),
        context({ ...songContext, defenderAbilityName: 'ぼうおん' }),
      );

      // Assert
      expect(message).toBeNull();
      expect(get(1).volatileState.perishCount).toBe(2);
      expect(get(2).volatileState.perishCount).toBeUndefined();
    });

    it('自分の特性が ぼうおん でも、自分には付く', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'ぼうおん' });

      // Act
      await new PerishSongEffect().onUse(
        get(1),
        get(2),
        context({ ...songContext, attackerAbilityName: 'ぼうおん' }),
      );

      // Assert
      expect(get(1).volatileState.perishCount).toBe(3);
      expect(get(2).volatileState.perishCount).toBe(3);
    });

    it('使い手が かたやぶり なら、相手の ぼうおん を無視して付ける', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'かたやぶり' },
        { ability: 'ぼうおん' },
      );

      // Act
      await new PerishSongEffect().onUse(
        get(1),
        get(2),
        context({
          ...songContext,
          attackerAbilityName: 'かたやぶり',
          defenderAbilityName: 'ぼうおん',
        }),
      );

      // Assert
      expect(get(2).volatileState.perishCount).toBe(3);
    });

    it('相手がそらをとぶで隠れていれば、相手には付かない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { status: { volatileState: { semiInvulnerable: 'air' } } },
      );

      // Act
      await new PerishSongEffect().onUse(get(1), get(2), context(songContext));

      // Assert
      expect(get(1).volatileState.perishCount).toBe(3);
      expect(get(2).volatileState.perishCount).toBeUndefined();
    });
  });
});
