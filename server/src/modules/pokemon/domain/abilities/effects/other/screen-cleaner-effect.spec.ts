import { getSideConditions } from '@/modules/battle/domain/state/side-state';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { ScreenCleanerEffect } from './screen-cleaner-effect';

describe('ScreenCleanerEffect（バリアフリー）', () => {
  it('場に出たとき、両方の陣営のリフレクター・ひかりのかべ・オーロラベールを消す', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle({ ability: 'バリアフリー' });
    await battleRepository.patchSideConditions(1, 1, { reflectTurns: 3 });
    await battleRepository.patchSideConditions(1, 2, {
      reflectTurns: 5,
      lightScreenTurns: 4,
      auroraVeilTurns: 2,
    });

    // Act
    await new ScreenCleanerEffect().onEntry(get(1), context());

    // Assert
    const battle = await battleRepository.findById(1);
    expect(getSideConditions(battle!.sideState, 1)).toEqual({});
    expect(getSideConditions(battle!.sideState, 2)).toEqual({});
  });

  it('壁ではない陣営の状態（おいかぜ・しんぴのまもり・設置技）は残す', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle({ ability: 'バリアフリー' });
    await battleRepository.patchSideConditions(1, 1, { tailwindTurns: 3, reflectTurns: 2 });
    await battleRepository.patchSideConditions(1, 2, { safeguardTurns: 4, stealthRock: true });

    // Act
    await new ScreenCleanerEffect().onEntry(get(1), context());

    // Assert
    const battle = await battleRepository.findById(1);
    expect(getSideConditions(battle!.sideState, 1)).toEqual({ tailwindTurns: 3 });
    expect(getSideConditions(battle!.sideState, 2)).toEqual({
      safeguardTurns: 4,
      stealthRock: true,
    });
  });

  it('コンテキストがなければ何もしない', async () => {
    // Arrange
    const { get, battleRepository } = createInMemoryBattle({ ability: 'バリアフリー' });

    // Act
    await new ScreenCleanerEffect().onEntry(get(1));

    // Assert
    expect(battleRepository.patchSideConditions).not.toHaveBeenCalled();
  });
});
