import { ToughClawsEffect } from './tough-claws-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { MoveFlags } from '@/modules/pokemon/domain/moves/move-flags';

describe('ToughClawsEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (
    moveName: string,
    moveCategory: 'Physical' | 'Special' | 'Status',
  ): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveName,
    moveCategory,
    moveFlags: MoveFlags.get(moveName),
  });

  let effect: ToughClawsEffect;

  beforeEach(() => {
    effect = new ToughClawsEffect();
  });

  it('接触技の威力を 1.3 倍（5325/4096）にする', () => {
    // Arrange
    const ctx = createCtx('かみくだく', 'Physical');

    // Act
    const result = effect.modifyBasePower(pokemon, 80, ctx);

    // Assert
    expect(result).toBe(104);
  });

  it('接触する特殊技（ドレインキッス）の威力も 1.3 倍にする', () => {
    // Arrange
    const ctx = createCtx('ドレインキッス', 'Special');

    // Act
    const result = effect.modifyBasePower(pokemon, 50, ctx);

    // Assert
    expect(result).toBe(65);
  });

  it('接触しない物理技（じしん）の威力は変更しない', () => {
    // Arrange
    const ctx = createCtx('じしん', 'Physical');

    // Act
    const result = effect.modifyBasePower(pokemon, 100, ctx);

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
