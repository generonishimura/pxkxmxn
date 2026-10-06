import { SynchronizeEffect } from './synchronize-effect';
import { AbilityRegistry } from '../../ability-registry';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { tryInflictStatus } from '../../../battle-events/status-infliction';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { EffectSource } from '../../../battle-events/effect-source';

describe('SynchronizeEffect（シンクロ）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('onStatusInflicted', () => {
    it.each([
      [StatusCondition.Burn],
      [StatusCondition.Paralysis],
      [StatusCondition.Poison],
      [StatusCondition.BadPoison],
    ])('相手に %s にされたら、相手も同じ状態異常にする', async status => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'シンクロ', status: { statusCondition: status } },
      );
      const source: EffectSource = { pokemon: get(1), kind: 'move', name: 'テスト技' };

      // Act
      const message = await new SynchronizeEffect().onStatusInflicted(
        get(2),
        status,
        source,
        context(),
      );

      // Assert
      expect(get(1).statusCondition).toBe(status);
      expect(message).toBe('Synchronize activated!');
    });

    it.each([
      [StatusCondition.Sleep],
      [StatusCondition.Freeze],
      [StatusCondition.Flinch],
      [StatusCondition.Confusion],
    ])('%s にされても、相手には何もしない', async status => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'シンクロ', status: { statusCondition: status } },
      );
      const source: EffectSource = { pokemon: get(1), kind: 'move', name: 'テスト技' };

      // Act
      const message = await new SynchronizeEffect().onStatusInflicted(
        get(2),
        status,
        source,
        context(),
      );

      // Assert
      expect(get(1).statusCondition).toBeNull();
      expect(message).toBeNull();
    });

    it('自分で状態異常になったときは、何もしない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'シンクロ', status: { statusCondition: StatusCondition.Burn } },
      );
      const source: EffectSource = { pokemon: get(2), kind: 'other', name: 'テスト' };

      // Act
      const message = await new SynchronizeEffect().onStatusInflicted(
        get(2),
        StatusCondition.Burn,
        source,
        context(),
      );

      // Assert
      expect(get(1).statusCondition).toBeNull();
      expect(message).toBeNull();
    });

    it('付与したポケモンがわからなければ、何もしない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'シンクロ', status: { statusCondition: StatusCondition.Burn } },
      );

      // Act
      const message = await new SynchronizeEffect().onStatusInflicted(
        get(2),
        StatusCondition.Burn,
        undefined,
        context(),
      );

      // Assert
      expect(get(1).statusCondition).toBeNull();
      expect(message).toBeNull();
    });

    it('相手がタイプで防げる状態異常（ほのおタイプにやけど）なら、相手は状態異常にならない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { types: ['ほのお'] },
        { ability: 'シンクロ', status: { statusCondition: StatusCondition.Burn } },
      );
      const source: EffectSource = { pokemon: get(1), kind: 'move', name: 'テスト技' };

      // Act
      const message = await new SynchronizeEffect().onStatusInflicted(
        get(2),
        StatusCondition.Burn,
        source,
        context(),
      );

      // Assert
      expect(get(1).statusCondition).toBeNull();
      expect(message).toBeNull();
    });

    it('相手がすでに状態異常なら、上書きしない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { status: { statusCondition: StatusCondition.Sleep } },
        { ability: 'シンクロ', status: { statusCondition: StatusCondition.Paralysis } },
      );
      const source: EffectSource = { pokemon: get(1), kind: 'move', name: 'テスト技' };

      // Act
      const message = await new SynchronizeEffect().onStatusInflicted(
        get(2),
        StatusCondition.Paralysis,
        source,
        context(),
      );

      // Assert
      expect(get(1).statusCondition).toBe(StatusCondition.Sleep);
      expect(message).toBeNull();
    });

    it('相手の特性（めんえき）で防がれたら、相手はどくにならない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'めんえき' },
        { ability: 'シンクロ', status: { statusCondition: StatusCondition.Poison } },
      );
      const source: EffectSource = { pokemon: get(1), kind: 'move', name: 'テスト技' };

      // Act
      const message = await new SynchronizeEffect().onStatusInflicted(
        get(2),
        StatusCondition.Poison,
        source,
        context(),
      );

      // Assert
      expect(get(1).statusCondition).toBeNull();
      expect(message).toBeNull();
    });
  });

  it('レジストリに登録され、inflictStatus から呼ばれて相手を同じ状態異常にする', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { ability: 'シンクロ' });

    // Act
    const { inflicted, messages } = await tryInflictStatus(
      get(2),
      StatusCondition.Paralysis,
      context(),
      { source: { pokemon: get(1), kind: 'move', name: 'でんじは' } },
    );

    // Assert
    expect(inflicted).toBe(true);
    expect(get(2).statusCondition).toBe(StatusCondition.Paralysis);
    expect(get(1).statusCondition).toBe(StatusCondition.Paralysis);
    expect(messages).toEqual(['Synchronize activated!']);
  });

  it('両方がシンクロでも、状態異常を返し合い続けない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ ability: 'シンクロ' }, { ability: 'シンクロ' });

    // Act
    const { messages } = await tryInflictStatus(get(2), StatusCondition.Burn, context(), {
      source: { pokemon: get(1), kind: 'move', name: 'おにび' },
    });

    // Assert
    expect(get(1).statusCondition).toBe(StatusCondition.Burn);
    expect(get(2).statusCondition).toBe(StatusCondition.Burn);
    expect(messages).toEqual(['Synchronize activated!']);
  });
});
