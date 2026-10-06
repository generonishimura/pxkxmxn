import { TriageEffect } from './triage-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { MoveFlags } from '@/modules/pokemon/domain/moves/move-flags';

describe('TriageEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (moveName: string): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveName,
    moveFlags: MoveFlags.get(moveName),
  });

  let effect: TriageEffect;

  beforeEach(() => {
    effect = new TriageEffect();
  });

  it('回復技の優先度を +3 する', () => {
    // Arrange
    const ctx = createCtx('じこさいせい');

    // Act
    const result = effect.modifyPriority(pokemon, 0, ctx);

    // Assert
    expect(result).toBe(3);
  });

  it('HP を吸い取る攻撃技（ドレインキッス）の優先度も +3 する', () => {
    // Arrange
    const ctx = createCtx('ドレインキッス');

    // Act
    const result = effect.modifyPriority(pokemon, 0, ctx);

    // Assert
    expect(result).toBe(3);
  });

  it('回復技でない技の優先度は変更しない', () => {
    // Arrange
    const ctx = createCtx('でんこうせっか');

    // Act
    const result = effect.modifyPriority(pokemon, 1, ctx);

    // Assert
    expect(result).toBeUndefined();
  });

  it('battleContext が無い場合は変更しない', () => {
    // Act
    const result = effect.modifyPriority(pokemon, 0, undefined);

    // Assert
    expect(result).toBeUndefined();
  });
});
