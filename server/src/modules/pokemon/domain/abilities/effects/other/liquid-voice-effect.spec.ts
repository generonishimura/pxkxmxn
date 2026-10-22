import { LiquidVoiceEffect } from './liquid-voice-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { MoveFlags } from '@/modules/pokemon/domain/moves/move-flags';

describe('LiquidVoiceEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (moveName: string): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveName,
    moveFlags: MoveFlags.get(moveName),
  });

  let effect: LiquidVoiceEffect;

  beforeEach(() => {
    effect = new LiquidVoiceEffect();
  });

  it('音技のタイプをみずにする', () => {
    // Arrange
    const ctx = createCtx('ハイパーボイス');

    // Act
    const result = effect.modifyMoveType(pokemon, 'ノーマル', ctx);

    // Assert
    expect(result).toBe('みず');
  });

  it('ノーマル以外の音技（むしのさざめき）もみずにする', () => {
    // Arrange
    const ctx = createCtx('むしのさざめき');

    // Act
    const result = effect.modifyMoveType(pokemon, 'むし', ctx);

    // Assert
    expect(result).toBe('みず');
  });

  it('音技でない技のタイプは変更しない', () => {
    // Arrange
    const ctx = createCtx('すてみタックル');

    // Act
    const result = effect.modifyMoveType(pokemon, 'ノーマル', ctx);

    // Assert
    expect(result).toBeUndefined();
  });

  it('battleContext が無い場合は変更しない', () => {
    // Act
    const result = effect.modifyMoveType(pokemon, 'ノーマル', undefined);

    // Assert
    expect(result).toBeUndefined();
  });
});
