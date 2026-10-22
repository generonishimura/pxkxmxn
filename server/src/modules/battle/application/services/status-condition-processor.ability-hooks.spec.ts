import { StatusConditionProcessorService } from './status-condition-processor.service';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import {
  InMemoryPokemon,
  createInMemoryBattle,
} from '@/modules/pokemon/domain/battle-events/__tests__/in-memory-battle';

describe('StatusConditionProcessorService - 状態異常の特性フック', () => {
  const setup = (pokemon: InMemoryPokemon) => {
    const battle = createInMemoryBattle(pokemon, { status: { isActive: false } });
    const processor = new StatusConditionProcessorService(
      battle.battleRepository,
      battle.trainedPokemonRepository,
    );
    const processTurnEnd = () => processor.processTurnEndAbilities(battle.context().battle);
    return { ...battle, processTurnEnd };
  };

  const poisoned = (data: Partial<BattlePokemonStatus> = {}): Partial<BattlePokemonStatus> => ({
    statusCondition: StatusCondition.Poison,
    ...data,
  });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('preventsIndirectDamage（マジックガード）', () => {
    it('どくのターン終了時ダメージを受けない', async () => {
      // Arrange
      AbilityRegistry.register('テストマジックガード', { preventsIndirectDamage: true });
      const { processTurnEnd, get } = setup({
        ability: 'テストマジックガード',
        status: poisoned(),
      });

      // Act
      await processTurnEnd();

      // Assert
      expect(get(1).currentHp).toBe(100);
    });

    it('特性がなければ、どくのダメージ（最大HPの1/8）を受ける', async () => {
      // Arrange
      const { processTurnEnd, get } = setup({ status: poisoned() });

      // Act
      await processTurnEnd();

      // Assert
      expect(get(1).currentHp).toBe(88);
    });
  });

  describe('modifyStatusDamage（ポイズンヒール・たいねつ）', () => {
    it('特性が返したダメージで HP を減らし、状態異常ともとのダメージを渡す', async () => {
      // Arrange
      const modifyStatusDamage = jest.fn(() => 0);
      AbilityRegistry.register('テストポイズンヒール', { modifyStatusDamage });
      const { processTurnEnd, get } = setup({
        ability: 'テストポイズンヒール',
        status: poisoned(),
      });

      // Act
      await processTurnEnd();

      // Assert
      expect(get(1).currentHp).toBe(100);
      expect(modifyStatusDamage).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1 }),
        StatusCondition.Poison,
        12,
        expect.objectContaining({ battleRepository: expect.anything() }),
      );
    });

    it('非同期で回復してから 0 を返すこともできる', async () => {
      // Arrange
      AbilityRegistry.register('テストポイズンヒール', {
        modifyStatusDamage: async (holder, _status, _damage, ctx) => {
          await ctx?.battleRepository?.updateBattlePokemonStatus(holder.id, {
            currentHp: holder.currentHp + 12,
          });
          return 0;
        },
      });
      const { processTurnEnd, get } = setup({
        ability: 'テストポイズンヒール',
        status: poisoned({ currentHp: 50 }),
      });

      // Act
      await processTurnEnd();

      // Assert
      expect(get(1).currentHp).toBe(62);
    });

    it('undefined を返すと、もとのダメージを受ける', async () => {
      // Arrange
      AbilityRegistry.register('テストたいねつ', { modifyStatusDamage: () => undefined });
      const { processTurnEnd, get } = setup({ ability: 'テストたいねつ', status: poisoned() });

      // Act
      await processTurnEnd();

      // Assert
      expect(get(1).currentHp).toBe(88);
    });
  });

  describe('sleepTurnMultiplier（はやおき）', () => {
    const asleep = { statusCondition: StatusCondition.Sleep };

    it('2なら、2ターン目の終わりには必ず目を覚ます', async () => {
      // Arrange: 毎回の解除判定が外れる乱数
      jest.spyOn(Math, 'random').mockReturnValue(0.6);
      AbilityRegistry.register('テストはやおき', { sleepTurnMultiplier: 2 });
      const { processTurnEnd, get } = setup({ ability: 'テストはやおき', status: asleep });

      // Act
      await processTurnEnd();
      const afterFirstTurn = get(1).statusCondition;
      await processTurnEnd();

      // Assert
      expect(afterFirstTurn).toBe(StatusCondition.Sleep);
      expect(get(1).statusCondition).toBe(StatusCondition.None);
    });

    it('特性がなければ、2ターン目の終わりにはまだねむっている', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0.6);
      const { processTurnEnd, get } = setup({ status: asleep });

      // Act
      await processTurnEnd();
      await processTurnEnd();

      // Assert
      expect(get(1).statusCondition).toBe(StatusCondition.Sleep);
    });
  });

  describe('ターン終了時の特性に渡すコンテキスト', () => {
    it('育成ポケモンリポジトリを渡す（相手の特性を調べる効果のため）', async () => {
      // Arrange
      const onTurnEnd = jest.fn(async () => undefined);
      AbilityRegistry.register('テストナイトメア', { onTurnEnd });
      const { processTurnEnd, trainedPokemonRepository } = setup({ ability: 'テストナイトメア' });

      // Act
      await processTurnEnd();

      // Assert
      expect(onTurnEnd).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ trainedPokemonRepository }),
      );
    });
  });
});
