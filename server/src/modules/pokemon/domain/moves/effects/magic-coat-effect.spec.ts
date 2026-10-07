import { MagicCoatEffect } from './magic-coat-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';

describe('MagicCoatEffect', () => {
  const createStatus = (id: number, volatileState: VolatileState = {}): BattlePokemonStatus =>
    new BattlePokemonStatus(
      id,
      1,
      id,
      id,
      true,
      100,
      100,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      null,
      volatileState,
    );

  const createContext = () => {
    const patchVolatileState = jest.fn().mockResolvedValue(undefined);
    const battleContext: BattleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
      battleRepository: { patchVolatileState } as unknown as BattleContext['battleRepository'],
    };
    return { battleContext, patchVolatileState };
  };

  it('このターンだけ、自分に magicCoat を付ける', async () => {
    // Arrange
    const effect = new MagicCoatEffect();
    const { battleContext, patchVolatileState } = createContext();

    // Act
    const message = await effect.onUse(createStatus(1), createStatus(2), battleContext);

    // Assert
    expect(patchVolatileState).toHaveBeenCalledWith(1, { magicCoat: true });
    expect(message).toBe('shrouded itself with Magic Coat!');
  });

  it('すでにマジックコートの状態なら失敗する', async () => {
    // Arrange
    const effect = new MagicCoatEffect();
    const { battleContext, patchVolatileState } = createContext();

    // Act
    const message = await effect.onUse(
      createStatus(1, { magicCoat: true }),
      createStatus(2),
      battleContext,
    );

    // Assert
    expect(patchVolatileState).not.toHaveBeenCalled();
    expect(message).toBe('But it failed');
  });
});
