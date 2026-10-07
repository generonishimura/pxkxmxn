import { TransformEffect } from './transform-effect';
import { MoveRegistry } from '../move-registry';
import { BattlePokemonMove } from '@/modules/battle/domain/entities/battle-pokemon-move.entity';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('TransformEffect（へんしん）', () => {
  beforeEach(() => {
    MoveRegistry.clear();
    MoveRegistry.initialize();
  });

  afterEach(() => {
    MoveRegistry.clear();
    MoveRegistry.initialize();
  });

  it('へんしん として登録されている', () => {
    // Arrange & Act
    const effect = MoveRegistry.get('へんしん');

    // Assert
    expect(effect).toBeInstanceOf(TransformEffect);
  });

  describe('onUse', () => {
    it('相手のタイプ・特性・能力ランク・技を写す', async () => {
      // Arrange
      const battle = createInMemoryBattle(
        { ability: 'じゅうなん', types: ['ノーマル'] },
        { ability: 'ふみん', types: ['ほのお', 'ひこう'], status: { attackRank: 2 } },
      );
      battle.battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
        new BattlePokemonMove(21, 2, 53, 15, 15),
      ]);

      // Act
      const message = await new TransformEffect().onUse(
        battle.get(1),
        battle.get(2),
        battle.context(),
      );

      // Assert
      const user = battle.get(1);
      expect(message).toBe('transformed!');
      expect(user.volatileState.transformedIntoStatusId).toBe(2);
      expect(user.volatileState.typeOverride).toEqual(['ほのお', 'ひこう']);
      expect(user.volatileState.abilityOverride).toBe('ふみん');
      expect(user.volatileState.moveSlotOverrides).toEqual([
        { battlePokemonMoveId: 21, moveId: 53, currentPp: 5, maxPp: 5 },
      ]);
      expect(user.attackRank).toBe(2);
    });

    it('相手がみがわり中なら失敗する', async () => {
      // Arrange
      const battle = createInMemoryBattle({}, { status: { volatileState: { substituteHp: 25 } } });

      // Act
      const message = await new TransformEffect().onUse(
        battle.get(1),
        battle.get(2),
        battle.context(),
      );

      // Assert
      expect(message).toBe('But it failed');
      expect(battle.get(1).volatileState.transformedIntoStatusId).toBeUndefined();
    });

    it('すでにへんしん中なら失敗する', async () => {
      // Arrange
      const battle = createInMemoryBattle({
        status: { volatileState: { transformedIntoStatusId: 2 } },
      });

      // Act
      const message = await new TransformEffect().onUse(
        battle.get(1),
        battle.get(2),
        battle.context(),
      );

      // Assert
      expect(message).toBe('But it failed');
    });

    it('相手がイリュージョンで化けていれば失敗する', async () => {
      // Arrange
      const battle = createInMemoryBattle(
        {},
        { ability: 'イリュージョン', status: { volatileState: { illusionStatusId: 3 } } },
      );

      // Act
      const message = await new TransformEffect().onUse(
        battle.get(1),
        battle.get(2),
        battle.context(),
      );

      // Assert
      expect(message).toBe('But it failed');
      expect(battle.get(1).volatileState.transformedIntoStatusId).toBeUndefined();
    });
  });
});
