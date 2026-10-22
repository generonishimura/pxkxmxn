import { TauntEffect } from './taunt-effect';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('TauntEffect（ちょうはつ）', () => {
  const effect = new TauntEffect();

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('shouldFail', () => {
    it('相手がすでにちょうはつされていれば失敗する', () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { status: { volatileState: { tauntTurns: 2 } } },
      );

      // Act
      const result = effect.shouldFail(get(1), get(2), context());

      // Assert
      expect(result).toBe(true);
    });

    it('相手がちょうはつされていなければ失敗しない', () => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const result = effect.shouldFail(get(1), get(2), context());

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('onUse', () => {
    it('相手がまだ行動していなければ、ちょうはつを 3 ターンにする', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const message = await effect.onUse(
        get(1),
        get(2),
        context({ moveName: 'ちょうはつ', defenderPendingMoveId: 10 }),
      );

      // Assert
      expect(message).toBe('fell for the taunt!');
      expect(get(2).volatileState.tauntTurns).toBe(3);
    });

    it('相手がもう行動していれば、ちょうはつを 4 ターンにする', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { status: { volatileState: { switchedInTurn: 0 } } },
      );

      // Act
      await effect.onUse(get(1), get(2), context({ moveName: 'ちょうはつ' }));

      // Assert
      expect(get(2).volatileState.tauntTurns).toBe(4);
    });

    it('相手がこのターンに交代で出てきたなら、ちょうはつを 3 ターンにする', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { status: { volatileState: { switchedInTurn: 1 } } },
      );

      // Act
      await effect.onUse(get(1), get(2), context({ moveName: 'ちょうはつ' }));

      // Assert
      expect(get(2).volatileState.tauntTurns).toBe(3);
    });

    it('相手がどんかんなら、ちょうはつにならず失敗する', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { ability: 'どんかん' });

      // Act
      const message = await effect.onUse(
        get(1),
        get(2),
        context({ moveName: 'ちょうはつ', defenderPendingMoveId: 10 }),
      );

      // Assert
      expect(message).toBe('but it failed');
      expect(get(2).volatileState.tauntTurns).toBeUndefined();
    });

    it('使用者がかたやぶりなら、どんかんの相手もちょうはつになる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'かたやぶり' },
        { ability: 'どんかん' },
      );

      // Act
      await effect.onUse(
        get(1),
        get(2),
        context({
          moveName: 'ちょうはつ',
          attackerAbilityName: 'かたやぶり',
          defenderPendingMoveId: 10,
        }),
      );

      // Assert
      expect(get(2).volatileState.tauntTurns).toBe(3);
    });
  });
});
