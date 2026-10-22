import { ShieldDustEffect } from './shield-dust-effect';
import { rollSecondaryEffect } from '../../../moves/secondary-effect';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('ShieldDustEffect', () => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('相手の技の追加効果を受けない特性として扱われる', () => {
    // Arrange
    const effect = new ShieldDustEffect();

    // Act & Assert
    expect(effect.blocksSecondaryEffects).toBe(true);
  });

  it('防御側がりんぷんなら、相手への追加効果は確率に関係なく発動しない', () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const context: BattleContext = {
      battle,
      secondaryEffectsSuppressed: new ShieldDustEffect().blocksSecondaryEffects,
    };

    // Act
    const activated = rollSecondaryEffect(1, context, 'target');

    // Assert
    expect(activated).toBe(false);
  });

  it('防御側がりんぷんでも、攻撃側自身への追加効果は発動する', () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const context: BattleContext = {
      battle,
      secondaryEffectsSuppressed: new ShieldDustEffect().blocksSecondaryEffects,
    };

    // Act
    const activated = rollSecondaryEffect(0.1, context, 'self');

    // Assert
    expect(activated).toBe(true);
  });
});
