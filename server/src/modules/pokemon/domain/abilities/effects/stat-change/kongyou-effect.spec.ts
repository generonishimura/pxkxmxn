import { GutsHpThresholdEffect } from './kongyou-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

describe('GutsHpThresholdEffect', () => {
  let effect: GutsHpThresholdEffect;
  let mockBattleRepository: jest.Mocked<IBattleRepository>;
  let battleContext: BattleContext;

  beforeEach(() => {
    effect = new GutsHpThresholdEffect();
    mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn(),
    } as any;

    const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
    battleContext = {
      battle,
      battleRepository: mockBattleRepository,
    };
  });

  describe('onEntry', () => {
    it('HPが1/3以下の場合、攻撃ランクを+1する', async () => {
      const pokemon = new BattlePokemonStatus(
        1,
        1,
        1,
        1,
        true,
        30, // currentHp: 30
        100, // maxHp: 100 (1/3以下)
        0, // attackRank: 0
        0,
        0,
        0,
        0,
        0,
        0,
        null,
      );

      await effect.onEntry(pokemon, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        attackRank: 1,
      });
    });

    it('HPが1/3より大きい場合、攻撃ランクを変更しない', async () => {
      const pokemon = new BattlePokemonStatus(
        1,
        1,
        1,
        1,
        true,
        34, // currentHp: 34
        100, // maxHp: 100 (1/3より大きい)
        0, // attackRank: 0
        0,
        0,
        0,
        0,
        0,
        0,
        null,
      );

      await effect.onEntry(pokemon, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('HPがちょうど1/3の場合、攻撃ランクを+1する', async () => {
      const pokemon = new BattlePokemonStatus(
        1,
        1,
        1,
        1,
        true,
        33, // currentHp: 33
        100, // maxHp: 100 (ちょうど1/3)
        0, // attackRank: 0
        0,
        0,
        0,
        0,
        0,
        0,
        null,
      );

      await effect.onEntry(pokemon, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        attackRank: 1,
      });
    });

    it('攻撃ランクが既に+6の場合、+6のまま維持する', async () => {
      const pokemon = new BattlePokemonStatus(
        1,
        1,
        1,
        1,
        true,
        30, // currentHp: 30
        100, // maxHp: 100
        6, // attackRank: 6 (最大値)
        0,
        0,
        0,
        0,
        0,
        0,
        null,
      );

      await effect.onEntry(pokemon, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        attackRank: 6,
      });
    });

    it('battleContextがない場合、何も実行しない', async () => {
      const pokemon = new BattlePokemonStatus(
        1,
        1,
        1,
        1,
        true,
        30,
        100,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        null,
      );

      await effect.onEntry(pokemon, undefined);

      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('battleRepositoryがない場合、何も実行しない', async () => {
      const pokemon = new BattlePokemonStatus(
        1,
        1,
        1,
        1,
        true,
        30,
        100,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        null,
      );

      const contextWithoutRepository: BattleContext = {
        battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
      };

      await effect.onEntry(pokemon, contextWithoutRepository);

      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });
  });
});

