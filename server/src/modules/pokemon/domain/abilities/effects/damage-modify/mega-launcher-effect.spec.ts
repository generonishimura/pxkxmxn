import { MegaLauncherEffect } from './mega-launcher-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { MoveFlags } from '@/modules/pokemon/domain/moves/move-flags';

describe('MegaLauncherEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (moveName: string): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveName,
    moveFlags: MoveFlags.get(moveName),
  });

  let effect: MegaLauncherEffect;

  beforeEach(() => {
    effect = new MegaLauncherEffect();
  });

  it('はどう技の威力を 1.5 倍（6144/4096）にする', () => {
    // Arrange
    const ctx = createCtx('はどうだん');

    // Act
    const result = effect.modifyBasePower(pokemon, 80, ctx);

    // Assert
    expect(result).toBe(120);
  });

  it('1.5 倍の端数は 4096 分率の丸めで計算する', () => {
    // Arrange
    const ctx = createCtx('りゅうのはどう');

    // Act
    const result = effect.modifyBasePower(pokemon, 85, ctx);

    // Assert
    expect(result).toBe(127);
  });

  it('はどう技でない技の威力は変更しない', () => {
    // Arrange
    const ctx = createCtx('10まんボルト');

    // Act
    const result = effect.modifyBasePower(pokemon, 90, ctx);

    // Assert
    expect(result).toBeUndefined();
  });

  it('battleContext が無い場合は変更しない', () => {
    // Act
    const result = effect.modifyBasePower(pokemon, 80, undefined);

    // Assert
    expect(result).toBeUndefined();
  });
});
