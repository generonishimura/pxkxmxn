import { BadDreamsEffect } from './bad-dreams-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('BadDreamsEffect', () => {
  // trainerId=1 が特性持ち、trainerId=2 が相手
  const owner = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createOpponent = (
    statusCondition: StatusCondition | null,
    currentHp: number = 160,
  ): BattlePokemonStatus =>
    new BattlePokemonStatus(2, 1, 2, 2, true, currentHp, 160, 0, 0, 0, 0, 0, 0, 0, statusCondition);

  const createCtx = (opponent: BattlePokemonStatus | null): BattleContext => {
    const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
    const mockBattleRepository = {
      findActivePokemonByBattleIdAndTrainerId: jest.fn().mockResolvedValue(opponent),
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    };
    return {
      battle,
      battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
    };
  };

  const effect = new BadDreamsEffect();

  it('相手がねむり状態なら最大HPの1/8を減らす', async () => {
    // Arrange
    const opponent = createOpponent(StatusCondition.Sleep);
    const ctx = createCtx(opponent);

    // Act
    await effect.onTurnEnd(owner, ctx);

    // Assert
    expect(ctx.battleRepository?.findActivePokemonByBattleIdAndTrainerId).toHaveBeenCalledWith(
      1,
      2,
    );
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(opponent.id, {
      currentHp: 140,
    });
  });

  it('残りHPが減少量より少ないときは 0 で止める', async () => {
    // Arrange
    const opponent = createOpponent(StatusCondition.Sleep, 10);
    const ctx = createCtx(opponent);

    // Act
    await effect.onTurnEnd(owner, ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(opponent.id, {
      currentHp: 0,
    });
  });

  it('相手がねむり以外の状態ならHPを減らさない', async () => {
    // Arrange
    const opponent = createOpponent(StatusCondition.Paralysis);
    const ctx = createCtx(opponent);

    // Act
    await effect.onTurnEnd(owner, ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('相手が既にひんしならHPを更新しない', async () => {
    // Arrange
    const opponent = createOpponent(StatusCondition.Sleep, 0);
    const ctx = createCtx(opponent);

    // Act
    await effect.onTurnEnd(owner, ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('相手が場にいなければ何もしない', async () => {
    // Arrange
    const ctx = createCtx(null);

    // Act
    await effect.onTurnEnd(owner, ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('battleRepository が無い場合は何もしない', async () => {
    // Arrange
    const ctx: BattleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    };

    // Act & Assert
    await expect(effect.onTurnEnd(owner, ctx)).resolves.toBeUndefined();
  });
});
