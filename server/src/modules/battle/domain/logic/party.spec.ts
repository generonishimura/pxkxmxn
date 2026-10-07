import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { PersistentPokemonState } from '../state/persistent-state';
import { countFaintedAllies, findFaintedPartyMembers, findSwitchTargets } from './party';

describe('party', () => {
  const status = (
    id: number,
    trainerId: number,
    options: { active?: boolean; hp?: number; persistent?: PersistentPokemonState } = {},
  ): BattlePokemonStatus =>
    new BattlePokemonStatus(
      id,
      1,
      id,
      trainerId,
      options.active ?? false,
      options.hp ?? 100,
      100,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      null,
      {},
      options.persistent ?? {},
    );

  describe('findSwitchTargets', () => {
    it('控えにいる、ひんしでない同じトレーナーのポケモンを ID の順に返す', () => {
      // Arrange
      const statuses = [
        status(5, 1),
        status(1, 1, { active: true }),
        status(3, 1),
        status(4, 1, { hp: 0 }),
        status(2, 2),
      ];

      // Act
      const targets = findSwitchTargets(statuses, 1);

      // Assert
      expect(targets.map(s => s.id)).toEqual([3, 5]);
    });
  });

  describe('findFaintedPartyMembers', () => {
    it('ひんしの同じトレーナーのポケモンを ID の順に返す', () => {
      // Arrange
      const statuses = [
        status(4, 1, { hp: 0 }),
        status(1, 1, { active: true }),
        status(3, 1, { hp: 0 }),
      ];

      // Act
      const fainted = findFaintedPartyMembers(statuses, 1);

      // Assert
      expect(fainted.map(s => s.id)).toEqual([3, 4]);
    });
  });

  describe('countFaintedAllies', () => {
    it('自分以外の、ひんしの仲間と復活した回数を数える', () => {
      // Arrange
      const holder = status(1, 1, { active: true });
      const statuses = [
        holder,
        status(2, 1, { hp: 0 }),
        status(3, 1, { persistent: { revivalCount: 1 } }),
        status(4, 1),
        status(5, 2, { hp: 0 }),
      ];

      // Act
      const count = countFaintedAllies(statuses, holder);

      // Assert
      expect(count).toBe(2);
    });
  });
});
