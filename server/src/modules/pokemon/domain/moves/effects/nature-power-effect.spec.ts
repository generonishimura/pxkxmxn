import { NaturePowerEffect } from './nature-power-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus, Field } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

const statusOf = (id: number): BattlePokemonStatus =>
  new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

const contextOf = (field: Field | null): BattleContext & { callMove: jest.Mock } => ({
  battle: new Battle(1, 1, 2, 1, 2, 1, null, field, BattleStatus.Active, null),
  callMove: jest.fn().mockResolvedValue('Used トライアタック and dealt 30 damage'),
});

describe('NaturePowerEffect（しぜんのちから）', () => {
  const effect = new NaturePowerEffect();

  it.each([
    ['フィールドがない', null, 'トライアタック'],
    ['フィールドがない（None）', Field.None, 'トライアタック'],
    ['エレキフィールド', Field.ElectricTerrain, '１０まんボルト'],
    ['グラスフィールド', Field.GrassyTerrain, 'エナジーボール'],
    ['ミストフィールド', Field.MistyTerrain, 'ムーンフォース'],
    ['サイコフィールド', Field.PsychicTerrain, 'サイコキネシス'],
  ])('%s なら %s を出す', async (_label, field, moveName) => {
    // Arrange
    const ctx = contextOf(field);

    // Act
    await effect.onUse(statusOf(1), statusOf(2), ctx);

    // Assert
    expect(ctx.callMove).toHaveBeenCalledWith({ moveName, calledBy: 'しぜんのちから' });
  });

  it('出した技のメッセージを返す', async () => {
    // Arrange
    const ctx = contextOf(null);

    // Act
    const message = await effect.onUse(statusOf(1), statusOf(2), ctx);

    // Assert
    expect(message).toBe('Used トライアタック and dealt 30 damage');
  });
});
