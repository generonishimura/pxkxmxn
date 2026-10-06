import { SereneGraceEffect } from './serene-grace-effect';
import { rollSecondaryEffect } from '../../../moves/secondary-effect';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('SereneGraceEffect', () => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('追加効果の発動確率の倍率は2倍', () => {
    // Arrange
    const effect = new SereneGraceEffect();

    // Act & Assert
    expect(effect.secondaryEffectChanceMultiplier).toBe(2);
  });

  it('30%の追加効果は、乱数が0.59なら発動する（確率が60%になる）', () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.59);
    const context: BattleContext = {
      battle,
      secondaryEffectChanceMultiplier: new SereneGraceEffect().secondaryEffectChanceMultiplier,
    };

    // Act
    const activated = rollSecondaryEffect(0.3, context);

    // Assert
    expect(activated).toBe(true);
  });

  it('30%の追加効果は、乱数が0.6なら発動しない', () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.6);
    const context: BattleContext = {
      battle,
      secondaryEffectChanceMultiplier: new SereneGraceEffect().secondaryEffectChanceMultiplier,
    };

    // Act
    const activated = rollSecondaryEffect(0.3, context);

    // Assert
    expect(activated).toBe(false);
  });
});
