import { DownloadEffect } from './download-effect';
import { AbilityRegistry } from '../../ability-registry';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Gender, TrainedPokemon } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { Nature } from '@/modules/battle/domain/logic/stat-calculator';

describe('DownloadEffect（ダウンロード）', () => {
  /**
   * 防御・特防の種族値だけを決めた育成ポケモン（レベル50・個体値31・努力値0・性格補正なしなので、実数値は種族値 + 20）
   */
  const createTrainedPokemon = (
    id: number,
    baseDefense: number,
    baseSpecialDefense: number,
  ): TrainedPokemon =>
    new TrainedPokemon(
      id,
      id,
      new Pokemon(
        id,
        id,
        'テスト',
        'Test',
        new Type(1, 'ノーマル', 'Normal'),
        null,
        100,
        100,
        baseDefense,
        100,
        baseSpecialDefense,
        100,
      ),
      null,
      50,
      Gender.Male,
      Nature.Hardy,
      null,
      31,
      31,
      31,
      31,
      31,
      31,
      0,
      0,
      0,
      0,
      0,
      0,
    );

  /**
   * ダウンロードの持ち主（ID 1）と、防御・特防を決めた相手（ID 2）のバトルを作る
   */
  const setUp = (
    baseDefense: number,
    baseSpecialDefense: number,
    opponentStatus: Partial<BattlePokemonStatus> = {},
  ) => {
    const battle = createInMemoryBattle({ ability: 'ダウンロード' }, { status: opponentStatus });
    const opponent = createTrainedPokemon(2, baseDefense, baseSpecialDefense);
    const original = battle.trainedPokemonRepository.findById.getMockImplementation();
    battle.trainedPokemonRepository.findById.mockImplementation((id: number) =>
      id === 2 ? Promise.resolve(opponent) : (original?.(id) ?? Promise.resolve(null)),
    );
    return battle;
  };

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('onEntry', () => {
    it('相手の防御が特防より低いとき、攻撃ランクを1上げる', async () => {
      // Arrange（防御100・特防120）
      const { context, get } = setUp(80, 100);

      // Act
      await new DownloadEffect().onEntry(get(1), context());

      // Assert
      expect(get(1).attackRank).toBe(1);
      expect(get(1).specialAttackRank).toBe(0);
    });

    it('相手の防御が特防より高いとき、特攻ランクを1上げる', async () => {
      // Arrange（防御120・特防100）
      const { context, get } = setUp(100, 80);

      // Act
      await new DownloadEffect().onEntry(get(1), context());

      // Assert
      expect(get(1).attackRank).toBe(0);
      expect(get(1).specialAttackRank).toBe(1);
    });

    it('相手の防御と特防が同じとき、特攻ランクを1上げる', async () => {
      // Arrange（防御120・特防120）
      const { context, get } = setUp(100, 100);

      // Act
      await new DownloadEffect().onEntry(get(1), context());

      // Assert
      expect(get(1).attackRank).toBe(0);
      expect(get(1).specialAttackRank).toBe(1);
    });

    it('相手のランク補正を込みで比べる（防御120に+2で240、特防150なら特攻）', async () => {
      // Arrange
      const { context, get } = setUp(100, 130, { defenseRank: 2 });

      // Act
      await new DownloadEffect().onEntry(get(1), context());

      // Assert
      expect(get(1).attackRank).toBe(0);
      expect(get(1).specialAttackRank).toBe(1);
    });

    it('マイナスのランクも込みで比べる（防御150に-1で100、特防100と同じなので特攻）', async () => {
      // Arrange
      const { context, get } = setUp(130, 80, { defenseRank: -1 });

      // Act
      await new DownloadEffect().onEntry(get(1), context());

      // Assert
      expect(get(1).attackRank).toBe(0);
      expect(get(1).specialAttackRank).toBe(1);
    });

    it('マイナスのランクを掛けた値は切り捨てて比べる（特防100に-1で66、防御66と同じなので特攻）', async () => {
      // Arrange（防御66・特防100。200/3 = 66.67 を切り捨てて66。切り捨てないと防御のほうが低くなる）
      const { context, get } = setUp(46, 80, { specialDefenseRank: -1 });

      // Act
      await new DownloadEffect().onEntry(get(1), context());

      // Assert
      expect(get(1).attackRank).toBe(0);
      expect(get(1).specialAttackRank).toBe(1);
    });

    it('相手の実数値が上書きされていれば、その値で比べる（パワーシェアなど）', async () => {
      // Arrange（防御120・特防100 を、防御90に上書き）
      const { context, get } = setUp(100, 80, {
        volatileState: { statOverrides: { defense: 90 } },
      });

      // Act
      await new DownloadEffect().onEntry(get(1), context());

      // Assert
      expect(get(1).attackRank).toBe(1);
      expect(get(1).specialAttackRank).toBe(0);
    });

    it('相手がひんしなら、何もしない', async () => {
      // Arrange
      const { context, get } = setUp(80, 100, { currentHp: 0 });

      // Act
      await new DownloadEffect().onEntry(get(1), context());

      // Assert
      expect(get(1).attackRank).toBe(0);
      expect(get(1).specialAttackRank).toBe(0);
    });

    it('相手が場にいなければ、何もしない', async () => {
      // Arrange
      const { context, get, battleRepository } = setUp(80, 100);
      battleRepository.findActivePokemonByBattleIdAndTrainerId.mockResolvedValue(null);

      // Act
      await new DownloadEffect().onEntry(get(1), context());

      // Assert
      expect(get(1).attackRank).toBe(0);
      expect(get(1).specialAttackRank).toBe(0);
    });

    it('育成ポケモンを調べられないときは、何もしない', async () => {
      // Arrange
      const { context, get } = setUp(80, 100);

      // Act
      await new DownloadEffect().onEntry(get(1), context({ trainedPokemonRepository: undefined }));

      // Assert
      expect(get(1).attackRank).toBe(0);
      expect(get(1).specialAttackRank).toBe(0);
    });
  });
});
