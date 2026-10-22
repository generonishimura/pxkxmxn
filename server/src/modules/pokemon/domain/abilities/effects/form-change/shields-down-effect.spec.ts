import { ShieldsDownEffect } from './shields-down-effect';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { AbilityRegistry } from '../../ability-registry';
import { canInflictStatus } from '../../../battle-events/status-infliction';
import { canApplyVolatile } from '../../../battle-events/volatile-infliction';

describe('ShieldsDownEffect（リミットシールド）', () => {
  const MINIOR = 774;
  const effect = new ShieldsDownEffect();

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('フォルム', () => {
    it('場に出たときに HP が半分以下なら、コアのすがたになる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        nationalDex: MINIOR,
        status: { currentHp: 50, maxHp: 100 },
      });

      // Act
      await effect.onEntry(get(1), context());

      // Assert
      expect(get(1).volatileState.form).toBe('core');
    });

    it('場に出たときに HP が半分より上なら、りゅうせいのすがたになる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        nationalDex: MINIOR,
        status: { currentHp: 51, maxHp: 100 },
      });

      // Act
      await effect.onEntry(get(1), context());

      // Assert
      expect(get(1).volatileState.form).toBe('meteor');
    });

    it('ターン終了時に HP が半分以下なら、コアのすがたになる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        nationalDex: MINIOR,
        status: { currentHp: 40, maxHp: 100 },
      });

      // Act
      await effect.onTurnEnd(get(1), context());

      // Assert
      expect(get(1).volatileState.form).toBe('core');
    });

    it('コアのすがたで HP が半分より上に戻ったら、りゅうせいのすがたに戻る', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        nationalDex: MINIOR,
        status: { currentHp: 80, maxHp: 100, volatileState: { form: 'core' } },
      });

      // Act
      await effect.onTurnEnd(get(1), context());

      // Assert
      expect(get(1).volatileState.form).toBe('meteor');
    });

    it('メテノでなければ、フォルムは変わらない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        nationalDex: 25,
        status: { currentHp: 10, maxHp: 100 },
      });

      // Act
      await effect.onTurnEnd(get(1), context());

      // Assert
      expect(get(1).volatileState.form).toBeUndefined();
    });
  });

  describe('りゅうせいのすがたの状態異常の無効', () => {
    it.each([
      StatusCondition.Burn,
      StatusCondition.Paralysis,
      StatusCondition.Poison,
      StatusCondition.BadPoison,
      StatusCondition.Sleep,
      StatusCondition.Freeze,
    ])('りゅうせいのすがたなら、%s にならない', status => {
      // Arrange
      const { get } = createInMemoryBattle({
        nationalDex: MINIOR,
        status: { volatileState: { form: 'meteor' } },
      });

      // Act
      const result = effect.canReceiveStatusCondition(get(1), status);

      // Assert
      expect(result).toBe(false);
    });

    it('コアのすがたなら、状態異常を防がない', () => {
      // Arrange
      const { get } = createInMemoryBattle({
        nationalDex: MINIOR,
        status: { volatileState: { form: 'core' } },
      });

      // Act
      const result = effect.canReceiveStatusCondition(get(1), StatusCondition.Burn);

      // Assert
      expect(result).toBeUndefined();
    });

    it('場に出たばかりでフォルムが決まっていない間は、コアのすがたとして状態異常を防がない', () => {
      // Arrange
      const { get } = createInMemoryBattle({
        nationalDex: MINIOR,
        status: { currentHp: 100, maxHp: 100 },
      });

      // Act
      const result = effect.canReceiveStatusCondition(get(1), StatusCondition.Poison);

      // Assert
      expect(result).toBeUndefined();
    });

    it('場に出たばかりでフォルムが決まっていない間は、あくびを防がない', () => {
      // Arrange
      const { get } = createInMemoryBattle({ nationalDex: MINIOR });

      // Act
      const result = effect.canReceiveVolatile(get(1), 'yawn');

      // Assert
      expect(result).toBeUndefined();
    });

    it('こんらんは防がない', () => {
      // Arrange
      const { get } = createInMemoryBattle({ nationalDex: MINIOR });

      // Act
      const result = effect.canReceiveStatusCondition(get(1), StatusCondition.Confusion);

      // Assert
      expect(result).toBeUndefined();
    });

    it('へんしん中は、状態異常を防がない', () => {
      // Arrange
      const { get } = createInMemoryBattle({
        nationalDex: MINIOR,
        status: { volatileState: { form: 'meteor', transformedIntoStatusId: 2 } },
      });

      // Act
      const result = effect.canReceiveStatusCondition(get(1), StatusCondition.Burn);

      // Assert
      expect(result).toBeUndefined();
    });

    it('りゅうせいのすがたなら、あくびを受けない', () => {
      // Arrange
      const { get } = createInMemoryBattle({
        nationalDex: MINIOR,
        status: { volatileState: { form: 'meteor' } },
      });

      // Act
      const result = effect.canReceiveVolatile(get(1), 'yawn');

      // Assert
      expect(result).toBe(false);
    });

    it('あくび以外の一時的な状態は防がない', () => {
      // Arrange
      const { get } = createInMemoryBattle({ nationalDex: MINIOR });

      // Act
      const result = effect.canReceiveVolatile(get(1), 'taunt');

      // Assert
      expect(result).toBeUndefined();
    });

    it('かたやぶりの技でも、まひにならない（本家でかたやぶりに無視されない特性）', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'かたやぶり' },
        {
          ability: 'リミットシールド',
          nationalDex: MINIOR,
          status: { volatileState: { form: 'meteor' } },
        },
      );

      // Act
      const result = await canInflictStatus(get(2), StatusCondition.Paralysis, context(), {
        source: { pokemon: get(1), kind: 'move', name: 'でんじは' },
      });

      // Assert
      expect(result).toBe(false);
    });

    it('かたやぶりの技でも、あくびを受けない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'かたやぶり' },
        {
          ability: 'リミットシールド',
          nationalDex: MINIOR,
          status: { volatileState: { form: 'meteor' } },
        },
      );

      // Act
      const result = await canApplyVolatile(get(2), 'yawn', context(), {
        source: { pokemon: get(1), kind: 'move', name: 'あくび' },
      });

      // Assert
      expect(result).toBe(false);
    });
  });
});
