import { MoveExecutorService } from './move-executor.service';
import { Battle, BattleStatus } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { BattlePokemonMove } from '../../domain/entities/battle-pokemon-move.entity';
import { IBattleRepository } from '../../domain/battle.repository.interface';
import { DamageCalculator } from '../../domain/logic/damage-calculator';
import { AccuracyCalculator } from '../../domain/logic/accuracy-calculator';
import { Nature } from '../../domain/logic/stat-calculator';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import {
  IMoveRepository,
  ITypeEffectivenessRepository,
} from '@/modules/pokemon/domain/pokemon.repository.interface';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { Move, MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import {
  Ability,
  AbilityTrigger,
  AbilityCategory,
} from '@/modules/pokemon/domain/entities/ability.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { BaseStatChangeEffect } from '@/modules/pokemon/domain/moves/effects/base/base-stat-change-effect';
import { IMoveEffect } from '@/modules/pokemon/domain/moves/move-effect.interface';

/**
 * 命中時に必ず相手の防御を1段階下げるテスト用の技効果
 */
class TestDefenseDropEffect extends BaseStatChangeEffect {
  protected readonly statType = 'defense' as const;
  protected readonly rankChange = -1;
  protected readonly chance = 1.0;
}

describe('MoveExecutorService', () => {
  const ATTACKER_ID = 1;
  const DEFENDER_ID = 2;
  const BATTLE_POKEMON_MOVE_ID = 1;

  const createStatus = (id: number): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const withChanges = (
    status: BattlePokemonStatus,
    data: Partial<BattlePokemonStatus>,
  ): BattlePokemonStatus => {
    const merged = { ...status, ...data };
    return new BattlePokemonStatus(
      merged.id,
      merged.battleId,
      merged.trainedPokemonId,
      merged.trainerId,
      merged.isActive,
      merged.currentHp,
      merged.maxHp,
      merged.attackRank,
      merged.defenseRank,
      merged.specialAttackRank,
      merged.specialDefenseRank,
      merged.speedRank,
      merged.accuracyRank,
      merged.evasionRank,
      merged.statusCondition,
    );
  };

  const createTrainedPokemon = (id: number, abilityName: string | null): TrainedPokemon => {
    const pokemon = new Pokemon(
      id,
      id,
      'TestPokemon',
      'TestPokemon',
      new Type(1, 'ノーマル', 'Normal'),
      null,
      100,
      100,
      100,
      100,
      100,
      100,
    );
    return new TrainedPokemon(
      id,
      id,
      pokemon,
      null,
      50,
      Gender.Male,
      Nature.Hardy,
      abilityName
        ? new Ability(
            id,
            abilityName,
            abilityName,
            'テスト用',
            AbilityTrigger.Passive,
            AbilityCategory.Immunity,
          )
        : null,
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
  };

  /**
   * 状態をメモリに持つバトルリポジトリのモック
   * updateBattlePokemonStatus の結果が findBattlePokemonStatusById に反映される
   */
  const createInMemoryBattleRepository = (
    statuses: Map<number, BattlePokemonStatus>,
  ): jest.Mocked<IBattleRepository> => ({
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findBattlePokemonStatusByBattleId: jest.fn(),
    createBattlePokemonStatus: jest.fn(),
    updateBattlePokemonStatus: jest.fn((id: number, data: Partial<BattlePokemonStatus>) => {
      const current = statuses.get(id);
      if (!current) {
        throw new Error(`status ${id} not found`);
      }
      const updated = withChanges(current, data);
      statuses.set(id, updated);
      return Promise.resolve(updated);
    }),
    findActivePokemonByBattleIdAndTrainerId: jest.fn(),
    findBattlePokemonStatusById: jest.fn((id: number) => Promise.resolve(statuses.get(id) ?? null)),
    findBattlePokemonMovesByBattlePokemonStatusId: jest.fn(),
    createBattlePokemonMove: jest.fn(),
    updateBattlePokemonMove: jest.fn(),
    findBattlePokemonMoveById: jest
      .fn()
      .mockResolvedValue(new BattlePokemonMove(BATTLE_POKEMON_MOVE_ID, ATTACKER_ID, 1, 10, 10)),
  });

  const setup = (defenderAbilityName: string, moveEffect: IMoveEffect) => {
    const statuses = new Map<number, BattlePokemonStatus>([
      [ATTACKER_ID, createStatus(ATTACKER_ID)],
      [DEFENDER_ID, createStatus(DEFENDER_ID)],
    ]);
    const battleRepository = createInMemoryBattleRepository(statuses);
    const trainedPokemons = new Map<number, TrainedPokemon>([
      [ATTACKER_ID, createTrainedPokemon(ATTACKER_ID, null)],
      [DEFENDER_ID, createTrainedPokemon(DEFENDER_ID, defenderAbilityName)],
    ]);
    const trainedPokemonRepository: jest.Mocked<ITrainedPokemonRepository> = {
      findById: jest.fn((id: number) => Promise.resolve(trainedPokemons.get(id) ?? null)),
      findByTrainerId: jest.fn(),
    };
    const move = new Move(
      1,
      'テスト技',
      'Test Move',
      new Type(1, 'ノーマル', 'Normal'),
      MoveCategory.Physical,
      80,
      100,
      10,
      0,
      null,
    );
    const moveRepository: jest.Mocked<IMoveRepository> = {
      findById: jest.fn().mockResolvedValue(move),
      findByPokemonId: jest.fn(),
    };
    const typeEffectivenessRepository: jest.Mocked<ITypeEffectivenessRepository> = {
      getTypeEffectivenessMap: jest.fn().mockResolvedValue(new Map()),
      findTypeByName: jest.fn().mockResolvedValue(null),
    };

    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    jest.spyOn(MoveRegistry, 'get').mockReturnValue(moveEffect);
    jest.spyOn(AccuracyCalculator, 'checkHit').mockReturnValue(true);
    jest.spyOn(DamageCalculator, 'calculate').mockResolvedValue(10);

    const service = new MoveExecutorService(
      battleRepository,
      trainedPokemonRepository,
      moveRepository,
      typeEffectivenessRepository,
    );
    const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);

    return { service, battle, statuses };
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('接触時の特性と技の追加効果', () => {
    it('くだけるよろいで防御が下がったあと、防御を下げる追加効果が重ねて下げる', async () => {
      // Arrange
      const { service, battle, statuses } = setup('くだけるよろい', new TestDefenseDropEffect());

      // Act
      await service.executeMove(
        battle,
        1,
        1,
        statuses.get(ATTACKER_ID)!,
        statuses.get(DEFENDER_ID)!,
        BATTLE_POKEMON_MOVE_ID,
      );

      // Assert
      expect(statuses.get(DEFENDER_ID)?.defenseRank).toBe(-2);
      expect(statuses.get(DEFENDER_ID)?.speedRank).toBe(2);
    });

    it('ぬめぬめで攻撃側の素早さが下がったあと、追加効果には最新の攻撃側が渡される', async () => {
      // Arrange
      const onHit = jest.fn().mockResolvedValue(null);
      const { service, battle, statuses } = setup('ぬめぬめ', { onHit });

      // Act
      await service.executeMove(
        battle,
        1,
        1,
        statuses.get(ATTACKER_ID)!,
        statuses.get(DEFENDER_ID)!,
        BATTLE_POKEMON_MOVE_ID,
      );

      // Assert
      const [passedAttacker] = onHit.mock.calls[0] as [BattlePokemonStatus];
      expect(passedAttacker.speedRank).toBe(-1);
    });
  });
});
