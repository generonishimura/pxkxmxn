import { getGlobalFieldState } from '@/modules/battle/domain/state/side-state';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { GravityEffect } from './gravity-effect';

describe('GravityEffect（じゅうりょく）', () => {
  it('じゅうりょくを 5 ターン張る', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();

    // Act
    const message = await new GravityEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(getGlobalFieldState(battle.sideState).gravityTurns).toBe(5);
    expect(message).toBe('Gravity intensified!');
  });

  it('すでにじゅうりょくなら失敗し、残りターン数を延ばさない', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();
    await battleRepository.patchGlobalFieldState(1, { gravityTurns: 2 });

    // Act
    const message = await new GravityEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(getGlobalFieldState(battle.sideState).gravityTurns).toBe(2);
    expect(message).toBe('But it failed');
  });

  it('場のポケモンのでんじふゆう・テレキネシスを消す', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle(
      { status: { volatileState: { magnetRiseTurns: 3 } } },
      { status: { volatileState: { telekinesisTurns: 2, tauntTurns: 1 } } },
    );

    // Act
    await new GravityEffect().onUse(get(1), get(2), context());

    // Assert
    expect(get(1).volatileState).toEqual({});
    expect(get(2).volatileState).toEqual({ tauntTurns: 1 });
    expect(battleRepository.patchVolatileState).toHaveBeenCalledTimes(2);
  });

  it('そらをとぶ・とびはねるで空にいる相手を地面に落とす', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { status: { volatileState: { semiInvulnerable: 'air', chargingMoveId: 19 } } },
    );

    // Act
    await new GravityEffect().onUse(get(1), get(2), context());

    // Assert
    expect(get(2).volatileState).toEqual({});
  });

  it('あなをほるで地中にいる相手はそのまま', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle(
      {},
      { status: { volatileState: { semiInvulnerable: 'underground', chargingMoveId: 91 } } },
    );

    // Act
    await new GravityEffect().onUse(get(1), get(2), context());

    // Assert
    expect(get(2).volatileState).toEqual({ semiInvulnerable: 'underground', chargingMoveId: 91 });
    expect(battleRepository.patchVolatileState).not.toHaveBeenCalled();
  });

  it('控えのポケモンの状態は書き換えない', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle(
      {},
      { status: { isActive: false, volatileState: { magnetRiseTurns: 3 } } },
    );

    // Act
    await new GravityEffect().onUse(get(1), get(2), context());

    // Assert
    expect(get(2).volatileState).toEqual({ magnetRiseTurns: 3 });
    expect(battleRepository.patchVolatileState).not.toHaveBeenCalled();
  });
});
