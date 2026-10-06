import { PunishmentEffect } from './punishment-effect';
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

describe('PunishmentEffect', () => {
  const battleContext = {} as BattleContext;

  describe('modifyMovePower', () => {
    it('相手のランクが上がっていないときは威力60になる', () => {
      // Arrange
      const attacker = createStatus(1);
      const defender = createStatus(2);

      // Act
      const power = new PunishmentEffect().modifyMovePower(attacker, defender, battleContext);

      // Assert
      expect(power).toBe(60);
    });

    it('相手の上がったランクの合計1段階ごとに威力が20上がる（命中・回避も数える）', () => {
      // Arrange
      const attacker = createStatus(1);
      const defender = createStatus(2, { attack: 2, accuracy: 1, evasion: 1 });

      // Act
      const power = new PunishmentEffect().modifyMovePower(attacker, defender, battleContext);

      // Assert
      expect(power).toBe(140);
    });

    it('相手の下がったランクは数えない', () => {
      // Arrange
      const attacker = createStatus(1);
      const defender = createStatus(2, { attack: 2, defense: -2, speed: -1 });

      // Act
      const power = new PunishmentEffect().modifyMovePower(attacker, defender, battleContext);

      // Assert
      expect(power).toBe(100);
    });

    it('威力は200が上限になる', () => {
      // Arrange
      const attacker = createStatus(1);
      const defender = createStatus(2, { attack: 6, specialAttack: 6 });

      // Act
      const power = new PunishmentEffect().modifyMovePower(attacker, defender, battleContext);

      // Assert
      expect(power).toBe(200);
    });

    it('自分のランクでは威力が変わらない', () => {
      // Arrange
      const attacker = createStatus(1, { attack: 6 });
      const defender = createStatus(2);

      // Act
      const power = new PunishmentEffect().modifyMovePower(attacker, defender, battleContext);

      // Assert
      expect(power).toBe(60);
    });
  });
});
