import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { AbilityRegistry } from '../abilities/ability-registry';
import { MoldBreakerEffect } from '../abilities/effects/mold-breaker-effect';
import { EffectSource } from './effect-source';
import { canInflictStatus, inflictStatus, tryInflictStatus } from './status-infliction';
import { createInMemoryBattle } from './__tests__/in-memory-battle';

describe('状態異常の付与', () => {
  const byMove = (abilityName?: string): EffectSource => ({
    kind: 'move',
    name: 'どくどく',
    abilityName,
  });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('canInflictStatus', () => {
    it('状態異常がなければ付与できる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const result = await canInflictStatus(get(2), StatusCondition.Poison, context(), {
        source: { ...byMove(), pokemon: get(1) },
      });

      // Assert
      expect(result).toBe(true);
    });

    it('すでに状態異常があれば付与できない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { status: { statusCondition: StatusCondition.Burn } },
      );

      // Act
      const result = await canInflictStatus(get(2), StatusCondition.Poison, context());

      // Assert
      expect(result).toBe(false);
    });

    it('ひんしのポケモンには付与できない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { status: { currentHp: 0 } });

      // Act
      const result = await canInflictStatus(get(2), StatusCondition.Poison, context());

      // Assert
      expect(result).toBe(false);
    });

    it.each([
      [StatusCondition.Poison, 'はがね'],
      [StatusCondition.BadPoison, 'どく'],
      [StatusCondition.Burn, 'ほのお'],
      [StatusCondition.Paralysis, 'でんき'],
      [StatusCondition.Freeze, 'こおり'],
    ])('%s は %s タイプに付与できない', async (status, typeName) => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { types: [typeName] });

      // Act
      const result = await canInflictStatus(get(2), status, context());

      // Assert
      expect(result).toBe(false);
    });

    it('付与元の特性が bypassesStatusTypeImmunity なら、タイプによる免疫を無視する', async () => {
      // Arrange
      AbilityRegistry.register('テストふしょく', {
        bypassesStatusTypeImmunity: (_holder, status) =>
          status === StatusCondition.Poison || status === StatusCondition.BadPoison,
      });
      const { context, get } = createInMemoryBattle(
        { ability: 'テストふしょく' },
        { types: ['はがね'] },
      );

      // Act
      const result = await canInflictStatus(get(2), StatusCondition.BadPoison, context(), {
        source: { ...byMove(), pokemon: get(1) },
      });

      // Assert
      expect(result).toBe(true);
    });

    describe('ふしょく（どくのこな: どく・はがね・くさに無効）', () => {
      const poisonPowderImmuneTypes = ['どく', 'はがね', 'くさ'];
      const registerCorrosion = () =>
        AbilityRegistry.register('テストふしょく', {
          bypassesStatusTypeImmunity: (_holder, status) =>
            status === StatusCondition.Poison || status === StatusCondition.BadPoison,
        });

      it('くさタイプ（粉技の免疫）は、付与元がふしょくでも付与できない', async () => {
        // Arrange
        registerCorrosion();
        const { context, get } = createInMemoryBattle(
          { ability: 'テストふしょく' },
          { types: ['くさ'] },
        );

        // Act
        const result = await canInflictStatus(get(2), StatusCondition.Poison, context(), {
          source: { ...byMove(), pokemon: get(1) },
          immuneTypes: poisonPowderImmuneTypes,
        });

        // Assert
        expect(result).toBe(false);
      });

      it('はがねタイプ（どくの免疫）は、付与元がふしょくなら付与できる', async () => {
        // Arrange
        registerCorrosion();
        const { context, get } = createInMemoryBattle(
          { ability: 'テストふしょく' },
          { types: ['はがね'] },
        );

        // Act
        const result = await canInflictStatus(get(2), StatusCondition.Poison, context(), {
          source: { ...byMove(), pokemon: get(1) },
          immuneTypes: poisonPowderImmuneTypes,
        });

        // Assert
        expect(result).toBe(true);
      });
    });

    it('immuneTypes を渡すと、そのタイプで免疫を判定する', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { types: ['くさ'] });

      // Act
      const result = await canInflictStatus(get(2), StatusCondition.Sleep, context(), {
        immuneTypes: ['くさ'],
      });

      // Assert
      expect(result).toBe(false);
    });

    it('対象の特性の canReceiveStatusCondition が false なら付与できず、付与元を受け取る', async () => {
      // Arrange
      const canReceiveStatusCondition = jest.fn().mockReturnValue(false);
      AbilityRegistry.register('テストめんえき', { canReceiveStatusCondition });
      const { context, get } = createInMemoryBattle({}, { ability: 'テストめんえき' });
      const source = { ...byMove(), pokemon: get(1) };

      // Act
      const result = await canInflictStatus(get(2), StatusCondition.Poison, context(), { source });

      // Assert
      expect(result).toBe(false);
      expect(canReceiveStatusCondition.mock.calls[0][3]).toBe(source);
    });

    it('技で付与するとき、付与元がかたやぶりなら対象の特性を無視する', async () => {
      // Arrange
      AbilityRegistry.register('テストめんえき', { canReceiveStatusCondition: () => false });
      AbilityRegistry.register('テストかたやぶり', new MoldBreakerEffect());
      const { context, get } = createInMemoryBattle(
        { ability: 'テストかたやぶり' },
        { ability: 'テストめんえき' },
      );

      // Act
      const result = await canInflictStatus(get(2), StatusCondition.Poison, context(), {
        source: { ...byMove(), pokemon: get(1) },
      });

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('inflictStatus', () => {
    it('状態異常を書き込み、対象の onStatusInflicted に付与元を渡す（シンクロ用）', async () => {
      // Arrange
      const onStatusInflicted = jest.fn().mockResolvedValue('synchronized!');
      AbilityRegistry.register('テストシンクロ', { onStatusInflicted });
      const { context, get } = createInMemoryBattle({}, { ability: 'テストシンクロ' });
      const source = { ...byMove(), pokemon: get(1) };

      // Act
      const messages = await inflictStatus(get(2), StatusCondition.Paralysis, context(), {
        source,
      });

      // Assert
      expect(get(2).statusCondition).toBe(StatusCondition.Paralysis);
      expect(onStatusInflicted).toHaveBeenCalledTimes(1);
      const [holder, status, givenSource] = onStatusInflicted.mock.calls[0];
      expect(holder.statusCondition).toBe(StatusCondition.Paralysis);
      expect(status).toBe(StatusCondition.Paralysis);
      expect(givenSource).toBe(source);
      expect(messages).toEqual(['synchronized!']);
    });

    it('付与元の onInflictStatus に、付与した相手を渡す（どくくぐつ用）', async () => {
      // Arrange
      const onInflictStatus = jest.fn().mockResolvedValue(null);
      AbilityRegistry.register('テストどくくぐつ', { onInflictStatus });
      const { context, get } = createInMemoryBattle({ ability: 'テストどくくぐつ' });

      // Act
      await inflictStatus(get(2), StatusCondition.Poison, context(), {
        source: { ...byMove(), pokemon: get(1) },
      });

      // Assert
      const [holder, target, status] = onInflictStatus.mock.calls[0];
      expect(holder.id).toBe(1);
      expect(target.id).toBe(2);
      expect(status).toBe(StatusCondition.Poison);
    });

    it('自分で自分に付与したときは、付与元の onInflictStatus を呼ばない', async () => {
      // Arrange
      const onInflictStatus = jest.fn().mockResolvedValue(null);
      AbilityRegistry.register('テストどくくぐつ', { onInflictStatus });
      const { context, get } = createInMemoryBattle({ ability: 'テストどくくぐつ' });

      // Act
      await inflictStatus(get(1), StatusCondition.Sleep, context(), {
        source: { ...byMove(), pokemon: get(1) },
      });

      // Assert
      expect(onInflictStatus).not.toHaveBeenCalled();
    });
  });

  describe('tryInflictStatus', () => {
    it('付与できるときだけ付与し、結果を返す', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { types: ['ほのお'] });

      // Act
      const burned = await tryInflictStatus(get(2), StatusCondition.Burn, context());
      const poisoned = await tryInflictStatus(get(2), StatusCondition.Poison, context());

      // Assert
      expect(burned).toEqual({ inflicted: false, messages: [] });
      expect(poisoned).toEqual({ inflicted: true, messages: [] });
      expect(get(2).statusCondition).toBe(StatusCondition.Poison);
    });
  });
});
