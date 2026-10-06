import { PoisonPuppeteerEffect } from './poison-puppeteer-effect';
import { AbilityRegistry } from '../../ability-registry';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { tryInflictStatus } from '../../../battle-events/status-infliction';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('PoisonPuppeteerEffect（どくくぐつ）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('どくくぐつとして登録されている', () => {
    // Act
    const effect = AbilityRegistry.get('どくくぐつ');

    // Assert
    expect(effect).toBeInstanceOf(PoisonPuppeteerEffect);
  });

  it.each([StatusCondition.Poison, StatusCondition.BadPoison])(
    '技で相手を %s にすると、相手をこんらんさせる',
    async status => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'どくくぐつ' }, {});

      // Act
      const result = await tryInflictStatus(get(2), status, context(), {
        source: { pokemon: get(1), kind: 'move', name: 'どくどく' },
      });

      // Assert
      expect(get(2).statusCondition).toBe(status);
      expect(get(2).volatileState.confusionTurns).toBeGreaterThanOrEqual(2);
      expect(get(2).volatileState.confusionTurns).toBeLessThanOrEqual(5);
      expect(result.messages).toEqual(['became confused!']);
    },
  );

  it('どく以外の状態異常では、こんらんさせない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ ability: 'どくくぐつ' }, {});

    // Act
    const result = await tryInflictStatus(get(2), StatusCondition.Paralysis, context(), {
      source: { pokemon: get(1), kind: 'move', name: 'でんじは' },
    });

    // Assert
    expect(get(2).volatileState.confusionTurns).toBeUndefined();
    expect(result.messages).toEqual([]);
  });

  it('マイペースの相手は、こんらんしない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'どくくぐつ' },
      { ability: 'マイペース' },
    );

    // Act
    const result = await tryInflictStatus(get(2), StatusCondition.Poison, context(), {
      source: { pokemon: get(1), kind: 'move', name: 'どくガス' },
    });

    // Assert
    expect(get(2).statusCondition).toBe(StatusCondition.Poison);
    expect(get(2).volatileState.confusionTurns).toBeUndefined();
    expect(result.messages).toEqual([]);
  });

  it('すでにこんらんしている相手は、こんらんの残り回数が変わらない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'どくくぐつ' },
      { status: { volatileState: { confusionTurns: 4 } } },
    );

    // Act
    const result = await tryInflictStatus(get(2), StatusCondition.Poison, context(), {
      source: { pokemon: get(1), kind: 'move', name: 'どくガス' },
    });

    // Assert
    expect(get(2).volatileState.confusionTurns).toBe(4);
    expect(result.messages).toEqual([]);
  });

  it('へんしんで写した特性では、こんらんさせない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'どくくぐつ', status: { volatileState: { transformedIntoStatusId: 2 } } },
      {},
    );

    // Act
    const result = await tryInflictStatus(get(2), StatusCondition.Poison, context(), {
      source: { pokemon: get(1), kind: 'move', name: 'どくガス' },
    });

    // Assert
    expect(get(2).statusCondition).toBe(StatusCondition.Poison);
    expect(get(2).volatileState.confusionTurns).toBeUndefined();
    expect(result.messages).toEqual([]);
  });
});
