import { VenoshockEffect } from './venoshock-effect';
import { createBattleContext, createBattlePokemonStatus } from './__tests__/test-helpers';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

describe('VenoshockEffect', () => {
  const effect = new VenoshockEffect();
  const attacker = createBattlePokemonStatus({ id: 1 });
  const battleContext = { ...createBattleContext(), movePower: 65 };

  it.each([
    ['どく', StatusCondition.Poison],
    ['もうどく', StatusCondition.BadPoison],
  ])('相手が%sなら威力が2倍になる', (_label, status) => {
    // Arrange
    const defender = createBattlePokemonStatus({ id: 2, statusCondition: status });

    // Act
    const power = effect.modifyMovePower(attacker, defender, battleContext);

    // Assert
    expect(power).toBe(130);
  });

  it.each([
    ['状態異常なし', null],
    ['やけど', StatusCondition.Burn],
    ['ねむり', StatusCondition.Sleep],
    ['こんらん', StatusCondition.Confusion],
  ])('相手が%sなら威力は変わらない', (_label, status) => {
    // Arrange
    const defender = createBattlePokemonStatus({ id: 2, statusCondition: status });

    // Act
    const power = effect.modifyMovePower(attacker, defender, battleContext);

    // Assert
    expect(power).toBeUndefined();
  });

  it('相手がぜったいねむりでも、どくでなければ威力は変わらない', () => {
    // Arrange
    const defender = createBattlePokemonStatus({ id: 2 });
    const context = { ...battleContext, defenderAbilityName: 'ぜったいねむり' };

    // Act
    const power = effect.modifyMovePower(attacker, defender, context);

    // Assert
    expect(power).toBeUndefined();
  });

  it('技の威力が分からなければ威力を変えない', () => {
    // Arrange
    const defender = createBattlePokemonStatus({ id: 2, statusCondition: StatusCondition.Poison });

    // Act
    const power = effect.modifyMovePower(attacker, defender, createBattleContext());

    // Assert
    expect(power).toBeUndefined();
  });
});
