import { hasSecondaryEffect, rollSecondaryEffect } from './secondary-effect';
import { BattleContext } from '../abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('rollSecondaryEffect', () => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('乱数が確率未満なら発動する', () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.29);
    const context: BattleContext = { battle };

    // Act
    const result = rollSecondaryEffect(0.3, context);

    // Assert
    expect(result).toBe(true);
  });

  it('乱数が確率以上なら発動しない', () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.3);
    const context: BattleContext = { battle };

    // Act
    const result = rollSecondaryEffect(0.3, context);

    // Assert
    expect(result).toBe(false);
  });

  it('確率倍率があると確率を掛けて判定する（30% × 2 = 60%）', () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.59);
    const context: BattleContext = { battle, secondaryEffectChanceMultiplier: 2 };

    // Act
    const result = rollSecondaryEffect(0.3, context);

    // Assert
    expect(result).toBe(true);
  });

  it('確率が1以上なら乱数を使わずに発動する', () => {
    // Arrange
    const random = jest.spyOn(Math, 'random');
    const context: BattleContext = { battle, secondaryEffectChanceMultiplier: 2 };

    // Act
    const result = rollSecondaryEffect(0.5, context);

    // Assert
    expect(result).toBe(true);
    expect(random).not.toHaveBeenCalled();
  });

  it('相手への追加効果が止められている場合は発動しない', () => {
    // Arrange
    const context: BattleContext = { battle, secondaryEffectsSuppressed: true };

    // Act
    const result = rollSecondaryEffect(1.0, context);

    // Assert
    expect(result).toBe(false);
  });

  it('自分への追加効果は止められていても発動する', () => {
    // Arrange
    const context: BattleContext = { battle, secondaryEffectsSuppressed: true };

    // Act
    const result = rollSecondaryEffect(1.0, context, 'self');

    // Assert
    expect(result).toBe(true);
  });

  it('ちからずくで追加効果が消えている場合は、相手への追加効果を発動しない', () => {
    // Arrange
    const context: BattleContext = { battle, secondaryEffectsRemoved: true };

    // Act
    const result = rollSecondaryEffect(1.0, context);

    // Assert
    expect(result).toBe(false);
  });

  it('ちからずくで追加効果が消えている場合は、自分への追加効果も発動しない', () => {
    // Arrange
    const context: BattleContext = { battle, secondaryEffectsRemoved: true };

    // Act
    const result = rollSecondaryEffect(1.0, context, 'self');

    // Assert
    expect(result).toBe(false);
  });

  it('ちからずくのあとに足す追加効果（おうじゃのしるし・あくしゅう）は、ちからずくでも発動する', () => {
    // Arrange
    const context: BattleContext = { battle, secondaryEffectsRemoved: true };

    // Act
    const result = rollSecondaryEffect(1.0, context, 'target', { ignoresSheerForce: true });

    // Assert
    expect(result).toBe(true);
  });
});

describe('hasSecondaryEffect', () => {
  it.each([
    'ほっぺすりすり',
    'かえんほうしゃ',
    'ニトロチャージ',
    'げんしのちから',
    'ムーンフォース',
  ])('本家で追加効果を持つ技（%s）は true', moveName => {
    // Act & Assert
    expect(hasSecondaryEffect(moveName)).toBe(true);
  });

  it.each(['たいあたり', 'とんぼがえり', 'はたきおとす', 'すてみタックル', 'インファイト'])(
    '追加効果ではない効果だけの技（%s）は false',
    moveName => {
      // Act & Assert
      expect(hasSecondaryEffect(moveName)).toBe(false);
    },
  );

  it('技名がないときは false', () => {
    // Act & Assert
    expect(hasSecondaryEffect(undefined)).toBe(false);
  });
});
