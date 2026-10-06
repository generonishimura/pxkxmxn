import { StatusConditionProcessorService } from './status-condition-processor.service';
import { IBattleRepository } from '../../domain/battle.repository.interface';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { Battle, BattleStatus, Weather, Field } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import {
  Ability,
  AbilityCategory,
  AbilityTrigger,
} from '@/modules/pokemon/domain/entities/ability.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { Nature } from '../../domain/logic/stat-calculator';

describe('StatusConditionProcessorService', () => {
  const battleId = 100;
  const trainedPokemonId = 10;

  const createBattle = (weather: Weather): Battle =>
    new Battle(battleId, 1, 2, 10, 20, 1, weather, Field.None, BattleStatus.Active, null);

  const createStatus = (
    currentHp: number,
    maxHp: number,
    statusCondition: StatusCondition | null,
  ): BattlePokemonStatus =>
    new BattlePokemonStatus(
      1,
      battleId,
      trainedPokemonId,
      1,
      true,
      currentHp,
      maxHp,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      statusCondition,
    );

  const createTrainedPokemon = (abilityName: string): TrainedPokemon =>
    new TrainedPokemon(
      trainedPokemonId,
      1,
      new Pokemon(
        1,
        1,
        'ポケモン',
        'Pokemon',
        new Type(1, 'ほのお', 'Fire'),
        null,
        100,
        50,
        50,
        50,
        50,
        50,
      ),
      null,
      50,
      Gender.Male,
      Nature.Hardy,
      new Ability(
        1,
        abilityName,
        abilityName,
        'テスト用の説明',
        AbilityTrigger.OnTurnEnd,
        AbilityCategory.DamageModify,
      ),
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
   * HP の書き込みを保持するインメモリのリポジトリを作る
   * 状態異常ダメージの書き込みが、後続の特性処理から読めるかを確かめるため
   */
  const setup = (initial: BattlePokemonStatus, abilityName: string) => {
    let stored = initial;
    const battleRepository: jest.Mocked<IBattleRepository> = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findBattlePokemonStatusByBattleId: jest.fn(async (_battleId: number) => [stored]),
      createBattlePokemonStatus: jest.fn(),
      updateBattlePokemonStatus: jest.fn(
        async (_id: number, data: Partial<BattlePokemonStatus>) => {
          stored = createStatus(
            data.currentHp ?? stored.currentHp,
            stored.maxHp,
            data.statusCondition !== undefined ? data.statusCondition : stored.statusCondition,
          );
          return stored;
        },
      ),
      findActivePokemonByBattleIdAndTrainerId: jest.fn(),
      findBattlePokemonStatusById: jest.fn(async (_id: number) => stored),
      findBattlePokemonMovesByBattlePokemonStatusId: jest.fn(),
      createBattlePokemonMove: jest.fn(),
      updateBattlePokemonMove: jest.fn(),
      findBattlePokemonMoveById: jest.fn(),
      patchVolatileState: jest.fn(),
      patchPersistentState: jest.fn(),
      patchSideConditions: jest.fn(),
      patchGlobalFieldState: jest.fn(),
    };
    const trainedPokemonRepository: jest.Mocked<ITrainedPokemonRepository> = {
      findById: jest.fn(async (_id: number) => createTrainedPokemon(abilityName)),
      findByTrainerId: jest.fn(),
    };
    const service = new StatusConditionProcessorService(battleRepository, trainedPokemonRepository);
    return { service, battleRepository, getStored: () => stored };
  };

  beforeEach(() => {
    AbilityRegistry.initialize();
  });

  describe('processTurnEndAbilities', () => {
    it('やけどダメージのあとのサンパワーは、やけど後の HP から最大 HP の 1/8 を引く', async () => {
      // Arrange: 最大 HP 160、やけどで 10、サンパワーで 20 減る
      const { service, getStored } = setup(
        createStatus(100, 160, StatusCondition.Burn),
        'サンパワー',
      );

      // Act
      await service.processTurnEndAbilities(createBattle(Weather.Sun));

      // Assert: 100 - 10 - 20 = 70
      expect(getStored().currentHp).toBe(70);
    });

    it('もうどくダメージでひんしになったら、サンパワーは HP を書き戻さない', async () => {
      // Arrange: 最大 HP 160。もうどくは 10 → 20 → 30 と増える
      // はれでない 2 ターンで HP を 55 → 45 → 25 にしておく
      const { service, getStored } = setup(
        createStatus(55, 160, StatusCondition.BadPoison),
        'サンパワー',
      );
      await service.processTurnEndAbilities(createBattle(Weather.None));
      await service.processTurnEndAbilities(createBattle(Weather.None));

      // Act: 3 ターン目、はれの下でもうどく 30 ダメージを受けてひんしになる
      await service.processTurnEndAbilities(createBattle(Weather.Sun));

      // Assert: サンパワーが古い HP（25）から 20 を引いて 5 に戻さず、0 のまま
      expect(getStored().currentHp).toBe(0);
    });

    it('ひんしのポケモンには、ターン終了時の特性効果を呼ばない', async () => {
      // Arrange
      const onTurnEnd = jest.fn(async () => undefined);
      AbilityRegistry.register('テスト用特性', { onTurnEnd });
      const { service } = setup(createStatus(10, 160, StatusCondition.Poison), 'テスト用特性');

      // Act: どくで 20 ダメージを受けてひんしになる
      await service.processTurnEndAbilities(createBattle(Weather.None));

      // Assert
      expect(onTurnEnd).not.toHaveBeenCalled();
    });

    it('ターン終了時の特性効果には、状態異常ダメージを反映した最新のステータスを渡す', async () => {
      // Arrange
      const onTurnEnd = jest.fn(async () => undefined);
      AbilityRegistry.register('テスト用特性', { onTurnEnd });
      const { service } = setup(createStatus(100, 160, StatusCondition.Poison), 'テスト用特性');

      // Act: どくで 20 ダメージ
      await service.processTurnEndAbilities(createBattle(Weather.None));

      // Assert
      expect(onTurnEnd).toHaveBeenCalledWith(
        expect.objectContaining({ currentHp: 80 }),
        expect.anything(),
      );
    });
  });
});
