import { PowerTripEffect } from './power-trip-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

type Ranks = {
  attack?: number;
  defense?: number;
  specialAttack?: number;
  specialDefense?: number;
  speed?: number;
  accuracy?: number;
  evasion?: number;
};

const createStatus = (id: number, ranks: Ranks = {}): BattlePokemonStatus =>
  new BattlePokemonStatus(
    id,
    1,
    id,
    id,
    true,
    100,
    100,
    ranks.attack ?? 0,
    ranks.defense ?? 0,
    ranks.specialAttack ?? 0,
    ranks.specialDefense ?? 0,
    ranks.speed ?? 0,
    ranks.accuracy ?? 0,
    ranks.evasion ?? 0,
    null,
  );

describe('PowerTripEffect', () => {
  const battleContext = {} as BattleContext;

  describe('modifyMovePower', () => {
    it('自分のランクが上がっていないときは威力20になる', () => {
      // Arrange
      const attacker = createStatus(1);
      const defender = createStatus(2);

      // Act
      const power = new PowerTripEffect().modifyMovePower(attacker, defender, battleContext);

      // Assert
      expect(power).toBe(20);
    });

    it('自分の上がったランクの合計1段階ごとに威力が20上がる（命中・回避も数える）', () => {
      // Arrange
      const attacker = createStatus(1, { attack: 1, speed: 1, evasion: 2 });
      const defender = createStatus(2);

      // Act
      const power = new PowerTripEffect().modifyMovePower(attacker, defender, battleContext);

      // Assert
      expect(power).toBe(100);
    });

    it('自分の下がったランクは数えない', () => {
      // Arrange
      const attacker = createStatus(1, { attack: 2, defense: -1, specialDefense: -1 });
      const defender = createStatus(2);

      // Act
      const power = new PowerTripEffect().modifyMovePower(attacker, defender, battleContext);

      // Assert
      expect(power).toBe(60);
    });

    it('威力に上限はない（全ランク+6で威力860）', () => {
      // Arrange
      const attacker = createStatus(1, {
        attack: 6,
        defense: 6,
        specialAttack: 6,
        specialDefense: 6,
        speed: 6,
        accuracy: 6,
        evasion: 6,
      });
      const defender = createStatus(2);

      // Act
      const power = new PowerTripEffect().modifyMovePower(attacker, defender, battleContext);

      // Assert
      expect(power).toBe(860);
    });

    it('相手のランクでは威力が変わらない', () => {
      // Arrange
      const attacker = createStatus(1);
      const defender = createStatus(2, { attack: 6 });

      // Act
      const power = new PowerTripEffect().modifyMovePower(attacker, defender, battleContext);

      // Assert
      expect(power).toBe(20);
    });
  });
});
