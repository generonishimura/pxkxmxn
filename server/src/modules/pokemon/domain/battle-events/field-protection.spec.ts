import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { Field } from '@/modules/battle/domain/entities/battle.entity';
import { AbilityRegistry } from '../abilities/ability-registry';
import { canInflictStatus } from './status-infliction';
import { canApplyVolatile } from './volatile-infliction';
import { applyStatChanges } from './stat-change';
import { createInMemoryBattle } from './__tests__/in-memory-battle';

/**
 * しんぴのまもり・しろいきり・エレキフィールド・ミストフィールドで、状態異常・能力の低下を防ぐ
 * ID 1（トレーナー1）が付与する側、ID 2（トレーナー2）が受ける側
 */
describe('場の状態による守り', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('しんぴのまもり', () => {
    it('相手の技で状態異常にならない', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      await battleRepository.patchSideConditions(1, 2, { safeguardTurns: 5 });

      // Act
      const result = await canInflictStatus(get(2), StatusCondition.Paralysis, context(), {
        source: { pokemon: get(1), kind: 'move', name: 'でんじは' },
      });

      // Assert
      expect(result).toBe(false);
    });

    it('相手の技でこんらんにならない', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      await battleRepository.patchSideConditions(1, 2, { safeguardTurns: 5 });

      // Act
      const result = await canInflictStatus(get(2), StatusCondition.Confusion, context(), {
        source: { pokemon: get(1), kind: 'move', name: 'あやしいひかり' },
      });

      // Assert
      expect(result).toBe(false);
    });

    it('自分で起こした状態異常（ねむる）は防がない', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      await battleRepository.patchSideConditions(1, 2, { safeguardTurns: 5 });

      // Act
      const result = await canInflictStatus(get(2), StatusCondition.Sleep, context(), {
        source: { pokemon: get(2), kind: 'move', name: 'ねむる' },
      });

      // Assert
      expect(result).toBe(true);
    });

    it('すりぬけの相手の技は防がない', async () => {
      // Arrange
      AbilityRegistry.register('すりぬけ', { infiltrates: true });
      const { context, get, battleRepository } = createInMemoryBattle({ ability: 'すりぬけ' });
      await battleRepository.patchSideConditions(1, 2, { safeguardTurns: 5 });

      // Act
      const result = await canInflictStatus(get(2), StatusCondition.Poison, context(), {
        source: { pokemon: get(1), kind: 'move', name: 'どくどく' },
      });

      // Assert
      expect(result).toBe(true);
    });

    it('相手のあくびを受けない', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      await battleRepository.patchSideConditions(1, 2, { safeguardTurns: 5 });

      // Act
      const result = await canApplyVolatile(get(2), 'yawn', context(), {
        source: { pokemon: get(1), kind: 'move', name: 'あくび' },
      });

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('フィールド', () => {
    it('エレキフィールドの間、地面にいるポケモンは眠らない（ねむるも含む）', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      await battleRepository.update(1, { field: Field.ElectricTerrain });

      // Act
      const result = await canInflictStatus(get(2), StatusCondition.Sleep, context(), {
        source: { pokemon: get(2), kind: 'move', name: 'ねむる' },
      });

      // Assert
      expect(result).toBe(false);
    });

    it('エレキフィールドの間、地面にいるポケモンはあくびを受けない', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      await battleRepository.update(1, { field: Field.ElectricTerrain });

      // Act
      const result = await canApplyVolatile(get(2), 'yawn', context(), {
        source: { pokemon: get(1), kind: 'move', name: 'あくび' },
      });

      // Assert
      expect(result).toBe(false);
    });

    it('エレキフィールドでも、ひこうタイプは眠る', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle({}, { types: ['ひこう'] });
      await battleRepository.update(1, { field: Field.ElectricTerrain });

      // Act
      const result = await canInflictStatus(get(2), StatusCondition.Sleep, context(), {
        source: { pokemon: get(1), kind: 'move', name: 'さいみんじゅつ' },
      });

      // Assert
      expect(result).toBe(true);
    });

    it.each([StatusCondition.Burn, StatusCondition.Confusion])(
      'ミストフィールドの間、地面にいるポケモンは %s にならない',
      async status => {
        // Arrange
        const { context, get, battleRepository } = createInMemoryBattle();
        await battleRepository.update(1, { field: Field.MistyTerrain });

        // Act
        const result = await canInflictStatus(get(2), status, context(), {
          source: { pokemon: get(1), kind: 'move', name: 'テスト' },
        });

        // Assert
        expect(result).toBe(false);
      },
    );

    it('ミストフィールドでも、隠れているポケモンは状態異常になる', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle(
        {},
        { status: { volatileState: { semiInvulnerable: 'underground' } } },
      );
      await battleRepository.update(1, { field: Field.MistyTerrain });

      // Act
      const result = await canInflictStatus(get(2), StatusCondition.Burn, context(), {
        source: { pokemon: get(1), kind: 'move', name: 'おにび' },
      });

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('しろいきり', () => {
    it('相手が起こした能力の低下を防ぐ', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      await battleRepository.patchSideConditions(1, 2, { mistTurns: 5 });

      // Act
      const result = await applyStatChanges(
        get(2),
        [{ statType: 'attack', rankChange: -1 }],
        context(),
        {
          source: { pokemon: get(1), kind: 'ability', name: 'いかく' },
        },
      );

      // Assert
      expect(result.applied).toEqual([]);
      expect(get(2).attackRank).toBe(0);
    });

    it('自分で下げた能力（ばかぢから）は防がない', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      await battleRepository.patchSideConditions(1, 2, { mistTurns: 5 });

      // Act
      const result = await applyStatChanges(
        get(2),
        [{ statType: 'attack', rankChange: -1 }],
        context(),
        {
          source: { pokemon: get(2), kind: 'move', name: 'ばかぢから' },
        },
      );

      // Assert
      expect(result.applied).toEqual([{ statType: 'attack', rankChange: -1 }]);
    });

    it('相手が起こした能力の上昇は防がない', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      await battleRepository.patchSideConditions(1, 2, { mistTurns: 5 });

      // Act
      const result = await applyStatChanges(
        get(2),
        [{ statType: 'attack', rankChange: 2 }],
        context(),
        {
          source: { pokemon: get(1), kind: 'move', name: 'いばる' },
        },
      );

      // Assert
      expect(result.applied).toEqual([{ statType: 'attack', rankChange: 2 }]);
    });

    it('すりぬけの相手の技による低下は防がない', async () => {
      // Arrange
      AbilityRegistry.register('すりぬけ', { infiltrates: true });
      const { context, get, battleRepository } = createInMemoryBattle({ ability: 'すりぬけ' });
      await battleRepository.patchSideConditions(1, 2, { mistTurns: 5 });

      // Act
      const result = await applyStatChanges(
        get(2),
        [{ statType: 'attack', rankChange: -1 }],
        context(),
        {
          source: { pokemon: get(1), kind: 'move', name: 'なきごえ' },
        },
      );

      // Assert
      expect(result.applied).toEqual([{ statType: 'attack', rankChange: -1 }]);
    });
  });
});
