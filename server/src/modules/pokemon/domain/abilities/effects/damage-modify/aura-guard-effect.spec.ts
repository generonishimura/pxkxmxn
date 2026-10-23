import { AuraGuardEffect } from './aura-guard-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { MoveFlags } from '@/modules/pokemon/domain/moves/move-flags';

describe('AuraGuardEffect（Aura Guard）', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const ctxOf = (moveName: string, moveTypeName: string): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveName,
    moveTypeName,
    moveFlags: MoveFlags.get(moveName),
  });

  it('接触技のダメージを半分にする', () => {
    // Act
    const result = new AuraGuardEffect().modifyDamage(
      pokemon,
      100,
      ctxOf('たいあたり', 'ノーマル'),
    );

    // Assert
    expect(result).toBe(50);
  });

  it('接触しない技のダメージは変えない', () => {
    // Act
    const result = new AuraGuardEffect().modifyDamage(pokemon, 100, ctxOf('じしん', 'じめん'));

    // Assert
    expect(result).toBe(100);
  });

  it('ほのおタイプの接触技も半分にする（もふもふと違い、ほのおを弱点にしない）', () => {
    // Act
    const result = new AuraGuardEffect().modifyDamage(
      pokemon,
      100,
      ctxOf('ほのおのパンチ', 'ほのお'),
    );

    // Assert
    expect(result).toBe(50);
  });
});
