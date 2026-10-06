import { SupersweetSyrupEffect } from './supersweet-syrup-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('SupersweetSyrupEffect', () => {
  // 自分: trainerId 1 / 相手: trainerId 2
  const self = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createOpponent = (evasionRank: number): BattlePokemonStatus =>
    new BattlePokemonStatus(2, 1, 2, 2, true, 100, 100, 0, 0, 0, 0, 0, 0, evasionRank, null);

  const createCtx = (opponent: BattlePokemonStatus | null): BattleContext => {
    const mockBattleRepository = {
      findActivePokemonByBattleIdAndTrainerId: jest.fn().mockResolvedValue(opponent),
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    };
    return {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
      battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
    };
  };

  let effect: SupersweetSyrupEffect;

  beforeEach(() => {
    effect = new SupersweetSyrupEffect();
  });

  it('場に出たとき相手の回避ランクを 1 段階下げる', async () => {
    // Arrange
    const ctx = createCtx(createOpponent(0));

    // Act
    await effect.onEntry(self, ctx);

    // Assert
    expect(ctx.battleRepository?.findActivePokemonByBattleIdAndTrainerId).toHaveBeenCalledWith(
      1,
      2,
    );
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(2, {
      evasionRank: -1,
    });
  });

  it('相手の回避ランクは -6 を下回らない', async () => {
    // Arrange
    const ctx = createCtx(createOpponent(-6));

    // Act
    await effect.onEntry(self, ctx);

    // Assert: ランクが変わらないので書き込まない
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('相手がいない場合は更新しない', async () => {
    // Arrange
    const ctx = createCtx(null);

    // Act
    await effect.onEntry(self, ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });
});
