import { StoredPowerEffect } from './stored-power-effect';
import { createBattleContext, createBattlePokemonStatus } from './__tests__/test-helpers';

describe('StoredPowerEffect', () => {
  const effect = new StoredPowerEffect();
  const defender = createBattlePokemonStatus({ id: 2 });
  const battleContext = { ...createBattleContext(), movePower: 20 };

  it('ランクが上がっていなければ威力は20', () => {
    // Arrange
    const attacker = createBattlePokemonStatus({ id: 1 });

    // Act
    const power = effect.modifyMovePower(attacker, defender, battleContext);

    // Assert
    expect(power).toBe(20);
  });

  it('上がったランク1つにつき威力が20増える（命中・回避も数える）', () => {
    // Arrange
    const attacker = createBattlePokemonStatus({
      id: 1,
      attackRank: 2,
      defenseRank: 1,
      specialAttackRank: 1,
      specialDefenseRank: 1,
      speedRank: 1,
      accuracyRank: 1,
      evasionRank: 1,
    });

    // Act
    const power = effect.modifyMovePower(attacker, defender, battleContext);

    // Assert
    expect(power).toBe(180);
  });

  it('下がったランクは数えない', () => {
    // Arrange
    const attacker = createBattlePokemonStatus({
      id: 1,
      attackRank: 2,
      defenseRank: -1,
      speedRank: -6,
    });

    // Act
    const power = effect.modifyMovePower(attacker, defender, battleContext);

    // Assert
    expect(power).toBe(60);
  });

  it('全ての能力が+6なら威力は860', () => {
    // Arrange
    const attacker = createBattlePokemonStatus({
      id: 1,
      attackRank: 6,
      defenseRank: 6,
      specialAttackRank: 6,
      specialDefenseRank: 6,
      speedRank: 6,
      accuracyRank: 6,
      evasionRank: 6,
    });

    // Act
    const power = effect.modifyMovePower(attacker, defender, battleContext);

    // Assert
    expect(power).toBe(860);
  });
});
