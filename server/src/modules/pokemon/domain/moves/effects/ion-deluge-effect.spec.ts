import { MoveRegistry } from '../move-registry';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { getGlobalFieldState } from '@/modules/battle/domain/state/side-state';
import { IonDelugeEffect } from './ion-deluge-effect';

describe('IonDelugeEffect（プラズマシャワー）', () => {
  it('場にプラズマシャワーの状態を書く', async () => {
    // Arrange
    const battle = createInMemoryBattle();

    // Act
    const result = await new IonDelugeEffect().onUse(
      battle.get(1),
      battle.get(2),
      battle.context(),
    );

    // Assert
    expect(result).toBe('A deluge of ions showers the battlefield!');
    const battleAfter = await battle.battleRepository.findById(1);
    expect(getGlobalFieldState(battleAfter!.sideState).ionDeluge).toBe(true);
  });

  it('このターンにすでにプラズマシャワーが使われていれば失敗する', async () => {
    // Arrange
    const battle = createInMemoryBattle();
    await battle.battleRepository.patchGlobalFieldState(1, { ionDeluge: true });
    battle.battleRepository.patchGlobalFieldState.mockClear();

    // Act
    const result = await new IonDelugeEffect().onUse(
      battle.get(1),
      battle.get(2),
      battle.context(),
    );

    // Assert
    expect(result).toBe('But it failed');
    expect(battle.battleRepository.patchGlobalFieldState).not.toHaveBeenCalled();
  });

  it('「プラズマシャワー」が登録されている', () => {
    // Arrange
    MoveRegistry.clear();
    MoveRegistry.initialize();

    // Act
    const effect = MoveRegistry.get('プラズマシャワー');

    // Assert
    expect(effect).toBeInstanceOf(IonDelugeEffect);
  });
});
