import { MoveExecutorService } from './move-executor.service';
import { Battle, BattleStatus, Weather } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { BattlePokemonMove } from '../../domain/entities/battle-pokemon-move.entity';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { IBattleRepository } from '../../domain/battle.repository.interface';
import { DamageCalculator, DamageCalculationParams } from '../../domain/logic/damage-calculator';
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
import { IAbilityEffect } from '@/modules/pokemon/domain/abilities/ability-effect.interface';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { IMoveEffect } from '@/modules/pokemon/domain/moves/move-effect.interface';
import { MoldBreakerEffect } from '@/modules/pokemon/domain/abilities/effects/mold-breaker-effect';
import { DoubleEdgeEffect } from '@/modules/pokemon/domain/moves/effects/double-edge-effect';
import { StatusConditionHandler } from '../../domain/logic/status-condition-handler';

describe('MoveExecutorService - ダメージ前後のフック', () => {
  const ATTACKER_ID = 1;
  const DEFENDER_ID = 2;
  const BATTLE_POKEMON_MOVE_ID = 1;
  const NORMAL = new Type(1, 'ノーマル', 'Normal');
  const FIRE = new Type(10, 'ほのお', 'Fire');

  const createStatus = (id: number, currentHp = 100): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, id, true, currentHp, 100, 0, 0, 0, 0, 0, 0, 0, null);

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

  const createTrainedPokemon = (id: number, abilityName?: string): TrainedPokemon =>
    new TrainedPokemon(
      id,
      id,
      new Pokemon(id, id, 'テスト', 'Test', NORMAL, null, 100, 100, 100, 100, 100, 100),
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
            AbilityCategory.Other,
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

  const createMove = (
    name: string,
    category: MoveCategory = MoveCategory.Physical,
    power: number | null = 80,
  ): Move => new Move(1, name, 'Test Move', NORMAL, category, power, 100, 10, 0, null);

  interface SetupOptions {
    move?: Move;
    moveEffect?: IMoveEffect;
    attackerAbility?: string;
    defenderAbility?: string;
    defenderHp?: number;
    weather?: Weather;
    damage?: number;
  }

  const setup = (options: SetupOptions = {}) => {
    const statuses = new Map<number, BattlePokemonStatus>([
      [ATTACKER_ID, createStatus(ATTACKER_ID)],
      [DEFENDER_ID, createStatus(DEFENDER_ID, options.defenderHp ?? 100)],
    ]);
    const battleRepository: jest.Mocked<IBattleRepository> = {
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
      findBattlePokemonStatusById: jest.fn((id: number) =>
        Promise.resolve(statuses.get(id) ?? null),
      ),
      findBattlePokemonMovesByBattlePokemonStatusId: jest.fn(),
      createBattlePokemonMove: jest.fn(),
      updateBattlePokemonMove: jest.fn(),
      findBattlePokemonMoveById: jest
        .fn()
        .mockResolvedValue(new BattlePokemonMove(BATTLE_POKEMON_MOVE_ID, ATTACKER_ID, 1, 10, 10)),
    };
    const trainedPokemons = new Map<number, TrainedPokemon>([
      [ATTACKER_ID, createTrainedPokemon(ATTACKER_ID, options.attackerAbility)],
      [DEFENDER_ID, createTrainedPokemon(DEFENDER_ID, options.defenderAbility)],
    ]);
    const trainedPokemonRepository: jest.Mocked<ITrainedPokemonRepository> = {
      findById: jest.fn((id: number) => Promise.resolve(trainedPokemons.get(id) ?? null)),
      findByTrainerId: jest.fn(),
    };
    const moveRepository: jest.Mocked<IMoveRepository> = {
      findById: jest.fn().mockResolvedValue(options.move ?? createMove('ほのおのパンチ')),
      findByPokemonId: jest.fn(),
    };
    const typeEffectivenessRepository: jest.Mocked<ITypeEffectivenessRepository> = {
      getTypeEffectivenessMap: jest.fn().mockResolvedValue(new Map()),
      findTypeByName: jest.fn((name: string) => Promise.resolve(name === FIRE.name ? FIRE : null)),
    };

    jest.spyOn(MoveRegistry, 'get').mockReturnValue(options.moveEffect);
    const checkHit = jest.spyOn(AccuracyCalculator, 'checkHit').mockReturnValue(true);
    const calculate = jest
      .spyOn(DamageCalculator, 'calculate')
      .mockResolvedValue(options.damage ?? 10);

    const service = new MoveExecutorService(
      battleRepository,
      trainedPokemonRepository,
      moveRepository,
      typeEffectivenessRepository,
    );
    const battle = new Battle(
      1,
      1,
      2,
      1,
      2,
      1,
      options.weather ?? null,
      null,
      BattleStatus.Active,
      null,
    );
    const execute = (executeOptions?: { isLastToMove?: boolean }) =>
      service.executeMove(
        battle,
        1,
        1,
        statuses.get(ATTACKER_ID)!,
        statuses.get(DEFENDER_ID)!,
        BATTLE_POKEMON_MOVE_ID,
        executeOptions,
      );
    const calculateParams = (index = 0): DamageCalculationParams => calculate.mock.calls[index][0];

    return { execute, statuses, calculate, calculateParams, checkHit, battleRepository };
  };

  const register = (name: string, effect: IAbilityEffect) => AbilityRegistry.register(name, effect);

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('技の威力・タイプの変更', () => {
    it('技の modifyMovePower が返した威力でダメージを計算する', async () => {
      // Arrange
      const { execute, calculateParams } = setup({
        moveEffect: { modifyMovePower: () => 130 },
      });

      // Act
      await execute();

      // Assert
      expect(calculateParams().move.power).toBe(130);
      expect(calculateParams().battleContext?.movePower).toBe(130);
    });

    it('威力が null の攻撃技でも、modifyMovePower があれば命中判定をしてその威力でダメージを計算する', async () => {
      // Arrange
      const { execute, calculate, calculateParams, checkHit } = setup({
        move: createMove('おしおき', MoveCategory.Physical, null),
        moveEffect: { modifyMovePower: () => 80 },
      });

      // Act
      const message = await execute();

      // Assert
      expect(checkHit).toHaveBeenCalledTimes(1);
      expect(calculate).toHaveBeenCalledTimes(1);
      expect(calculateParams().move.power).toBe(80);
      expect(message).toBe('Used おしおき and dealt 10 damage');
    });

    it('威力が null の攻撃技で、modifyMovePower が威力を返さなければ今までどおりダメージを与えない', async () => {
      // Arrange
      const { execute, calculate } = setup({
        move: createMove('おしおき', MoveCategory.Physical, null),
        moveEffect: { modifyMovePower: () => undefined },
      });

      // Act
      const message = await execute();

      // Assert
      expect(calculate).not.toHaveBeenCalled();
      expect(message).toBe('Used おしおき');
    });

    it('威力が null の攻撃技で modifyMovePower がなければ、今までどおり命中判定もダメージもない', async () => {
      // Arrange
      const { execute, calculate, checkHit } = setup({
        move: createMove('ちきゅうなげ', MoveCategory.Physical, null),
      });

      // Act
      const message = await execute();

      // Assert
      expect(checkHit).not.toHaveBeenCalled();
      expect(calculate).not.toHaveBeenCalled();
      expect(message).toBe('Used ちきゅうなげ');
    });

    it('技の modifyMoveType が返したタイプでダメージを計算し、威力の判定にも使う', async () => {
      // Arrange
      const seenTypes: Array<string | undefined> = [];
      const { execute, calculateParams } = setup({
        moveEffect: {
          modifyMoveType: () => 'ほのお',
          modifyMovePower: (_a, _d, ctx) => {
            seenTypes.push(ctx.moveTypeName);
            return undefined;
          },
        },
      });

      // Act
      await execute();

      // Assert
      expect(calculateParams().moveType).toBe(FIRE);
      expect(calculateParams().move.typeId).toBe(FIRE.id);
      expect(seenTypes).toEqual(['ほのお']);
    });

    it('攻撃側特性の modifyMoveType でもタイプを変更できる', async () => {
      // Arrange
      register('テストボイス', {
        modifyMoveType: (_p, typeName, ctx) =>
          ctx?.moveFlags?.has('punch') && typeName === 'ノーマル' ? 'ほのお' : undefined,
      });
      const { execute, calculateParams } = setup({ attackerAbility: 'テストボイス' });

      // Act
      await execute();

      // Assert
      expect(calculateParams().moveType).toBe(FIRE);
    });

    it('タイプを変えても、技本来のタイプを baseMoveTypeName として渡す（-スキン系の判定用）', async () => {
      // Arrange
      register('テストスキン', { modifyMoveType: () => 'ほのお' });
      const { execute, calculateParams } = setup({ attackerAbility: 'テストスキン' });

      // Act
      await execute();

      // Assert
      expect(calculateParams().battleContext?.moveTypeName).toBe('ほのお');
      expect(calculateParams().battleContext?.baseMoveTypeName).toBe('ノーマル');
    });

    it('技の ignoresBurnPenalty と attackStatOverride をダメージ計算に渡す', async () => {
      // Arrange
      const { execute, calculateParams } = setup({
        moveEffect: {
          ignoresBurnPenalty: true,
          attackStatOverride: { source: 'defender', stat: 'attack' },
        },
      });

      // Act
      await execute();

      // Assert
      expect(calculateParams().ignoresBurnPenalty).toBe(true);
      expect(calculateParams().attackStatOverride).toEqual({ source: 'defender', stat: 'attack' });
    });
  });

  describe('ヒットのコンテキスト', () => {
    it('技名・技フラグ・行動順・実数値をダメージ計算に渡す', async () => {
      // Arrange
      const { execute, calculateParams } = setup();

      // Act
      await execute({ isLastToMove: true });

      // Assert
      const context = calculateParams().battleContext;
      expect(context?.moveName).toBe('ほのおのパンチ');
      expect(context?.moveFlags?.has('punch')).toBe(true);
      expect(context?.isLastToMove).toBe(true);
      expect(context?.attackerStats?.attack).toBe(120);
      expect(context?.defenderAbilityName).toBeUndefined();
    });

    it('反動のある技（hasRecoil）ならコンテキストの hasRecoil を true にする', async () => {
      // Arrange
      const { execute, calculateParams } = setup({ moveEffect: new DoubleEdgeEffect() });

      // Act
      await execute();

      // Assert
      expect(calculateParams().battleContext?.hasRecoil).toBe(true);
    });

    it('反動のない技ならコンテキストの hasRecoil は false', async () => {
      // Arrange
      const { execute, calculateParams } = setup();

      // Act
      await execute();

      // Assert
      expect(calculateParams().battleContext?.hasRecoil).toBe(false);
    });

    it('攻撃側特性の modifyMoveFlags で技フラグを変更できる', async () => {
      // Arrange
      register('テストえんかく', {
        modifyMoveFlags: (_p, flags) => new Set([...flags].filter(flag => flag !== 'contact')),
      });
      const { execute, calculateParams } = setup({ attackerAbility: 'テストえんかく' });

      // Act
      await execute();

      // Assert
      expect(calculateParams().battleContext?.moveFlags?.has('contact')).toBe(false);
      expect(calculateParams().battleContext?.moveFlags?.has('punch')).toBe(true);
    });

    it('天候を消す特性が場にいると、天候なしでダメージを計算する', async () => {
      // Arrange
      register('テストてんき', { suppressesWeather: true });
      const { execute, calculateParams } = setup({
        weather: Weather.Rain,
        defenderAbility: 'テストてんき',
      });

      // Act
      await execute();

      // Assert
      expect(calculateParams().weather).toBe(Weather.None);
      expect(calculateParams().battleContext?.weather).toBe(Weather.None);
    });

    it('技と攻撃側特性が無視する防御側のランクをまとめて渡す', async () => {
      // Arrange
      register('テストしんがん', { ignoreOpponentRanks: () => ['evasion'] });
      const { execute, calculateParams, checkHit } = setup({
        attackerAbility: 'テストしんがん',
        moveEffect: { ignoredDefenderRanks: ['defense'] },
      });

      // Act
      await execute();

      // Assert
      const ignored = calculateParams().battleContext?.ignoredDefenderRanks;
      expect(ignored?.has('defense')).toBe(true);
      expect(ignored?.has('evasion')).toBe(true);
      const accuracyContext: BattleContext | undefined = checkHit.mock.calls[0][5];
      expect(accuracyContext?.ignoredDefenderRanks?.has('evasion')).toBe(true);
    });

    it('防御側特性が無視する攻撃側のランクを渡し、かたやぶりでは無視しない', async () => {
      // Arrange
      register('テストてんねん', {
        ignoreOpponentRanks: (_p, role) => (role === 'defender' ? ['attack'] : undefined),
      });
      register('テストかたやぶり', new MoldBreakerEffect());
      const normal = setup({ defenderAbility: 'テストてんねん' });
      await normal.execute();
      const ignoredNormally = normal.calculateParams().battleContext?.ignoredAttackerRanks;
      jest.restoreAllMocks();
      const moldBreaker = setup({
        defenderAbility: 'テストてんねん',
        attackerAbility: 'テストかたやぶり',
      });

      // Act
      await moldBreaker.execute();

      // Assert
      expect(ignoredNormally?.has('attack')).toBe(true);
      expect(moldBreaker.calculateParams().battleContext?.ignoredAttackerRanks?.size).toBe(0);
    });

    it('攻撃側の確率倍率と防御側の追加効果無効を onHit のコンテキストに入れる', async () => {
      // Arrange
      register('テストめぐみ', { secondaryEffectChanceMultiplier: 2 });
      register('テストりんぷん', { blocksSecondaryEffects: true });
      const onHit = jest.fn().mockResolvedValue(null);
      const { execute } = setup({
        attackerAbility: 'テストめぐみ',
        defenderAbility: 'テストりんぷん',
        moveEffect: { onHit },
      });

      // Act
      await execute();

      // Assert
      const context: BattleContext = onHit.mock.calls[0][2];
      expect(context.secondaryEffectChanceMultiplier).toBe(2);
      expect(context.secondaryEffectsSuppressed).toBe(true);
    });
  });

  describe('連続攻撃と追加ヒット', () => {
    it('beforeDamage が決めた回数だけダメージを与える', async () => {
      // Arrange
      const { execute, calculate, statuses } = setup({
        moveEffect: {
          beforeDamage: async (_a, _d, _m, ctx) => {
            ctx.multiHitCount = 3;
          },
        },
      });

      // Act
      const message = await execute();

      // Assert
      expect(calculate).toHaveBeenCalledTimes(3);
      expect(statuses.get(DEFENDER_ID)?.currentHp).toBe(70);
      expect(message).toContain('dealt 30 damage');
      expect(message).toContain('hit 3 times');
    });

    it('2回目以降のヒットは最新の防御側の状態で計算し、ヒット番号を渡す', async () => {
      // Arrange
      const { execute, calculateParams } = setup({
        moveEffect: {
          beforeDamage: async (_a, _d, _m, ctx) => {
            ctx.multiHitCount = 2;
          },
        },
      });

      // Act
      await execute();

      // Assert
      expect(calculateParams(1).defender.currentHp).toBe(90);
      expect(calculateParams(0).battleContext?.hitIndex).toBe(0);
      expect(calculateParams(1).battleContext?.hitIndex).toBe(1);
    });

    it('防御側がひんしになったら残りの攻撃をしない', async () => {
      // Arrange
      const { execute, calculate, statuses } = setup({
        defenderHp: 15,
        moveEffect: {
          beforeDamage: async (_a, _d, _m, ctx) => {
            ctx.multiHitCount = 5;
          },
        },
      });

      // Act
      await execute();

      // Assert
      expect(calculate).toHaveBeenCalledTimes(2);
      expect(statuses.get(DEFENDER_ID)?.currentHp).toBe(0);
    });

    it('攻撃側特性の getAdditionalHitPowerRatios で追加ヒットを加える（威力は4096分率で補正）', async () => {
      // Arrange
      register('テストおやこあい', { getAdditionalHitPowerRatios: () => [0.25] });
      const { execute, calculate, calculateParams } = setup({
        attackerAbility: 'テストおやこあい',
      });

      // Act
      await execute();

      // Assert
      expect(calculate).toHaveBeenCalledTimes(2);
      expect(calculateParams(0).move.power).toBe(80);
      expect(calculateParams(1).move.power).toBe(20);
    });

    it('連続技には追加ヒットを加えない', async () => {
      // Arrange
      const getAdditionalHitPowerRatios = jest.fn().mockReturnValue([0.25]);
      register('テストおやこあい', { getAdditionalHitPowerRatios });
      const { execute, calculate } = setup({
        attackerAbility: 'テストおやこあい',
        moveEffect: {
          beforeDamage: async (_a, _d, _m, ctx) => {
            ctx.multiHitCount = 2;
          },
        },
      });

      // Act
      await execute();

      // Assert
      expect(calculate).toHaveBeenCalledTimes(2);
      expect(getAdditionalHitPowerRatios).not.toHaveBeenCalled();
    });

    it('afterDamage に全ヒットの合計ダメージを渡す', async () => {
      // Arrange
      const afterDamage = jest.fn().mockResolvedValue('recoil!');
      const { execute } = setup({
        moveEffect: {
          beforeDamage: async (_a, _d, _m, ctx) => {
            ctx.multiHitCount = 2;
          },
          afterDamage,
        },
      });

      // Act
      const message = await execute();

      // Assert
      expect(afterDamage).toHaveBeenCalledTimes(1);
      expect(afterDamage.mock.calls[0][2]).toBe(20);
      expect(message).toContain('recoil!');
    });

    it('afterDamage とメッセージには、残りHPを超えた分を除いた実際に減らしたHPを使う', async () => {
      // Arrange
      const afterDamage = jest.fn().mockResolvedValue(null);
      const { execute } = setup({ defenderHp: 10, damage: 50, moveEffect: { afterDamage } });

      // Act
      const message = await execute();

      // Assert
      expect(afterDamage.mock.calls[0][2]).toBe(10);
      expect(message).toBe('Used ほのおのパンチ and dealt 10 damage');
    });

    it('反動技の反動は実際に減らしたHPから計算する', async () => {
      // Arrange
      const { execute, statuses } = setup({
        defenderHp: 10,
        damage: 50,
        moveEffect: new DoubleEdgeEffect(),
      });

      // Act
      await execute();

      // Assert
      expect(statuses.get(ATTACKER_ID)?.currentHp).toBe(97);
    });
  });

  describe('isImmuneToMove（技そのものの無効化）', () => {
    it('防御側特性が無効にすると、ダメージを与えずPPだけ消費する', async () => {
      // Arrange
      register('テストぼうおん', { isImmuneToMove: (_p, ctx) => ctx?.moveFlags?.has('punch') });
      const { execute, calculate, battleRepository } = setup({ defenderAbility: 'テストぼうおん' });

      // Act
      const message = await execute();

      // Assert
      expect(calculate).not.toHaveBeenCalled();
      expect(battleRepository.updateBattlePokemonMove).toHaveBeenCalled();
      expect(message).toContain('had no effect');
    });

    it('無効にしたあと防御側特性の onMoveBlocked を呼び、そのメッセージを足す', async () => {
      // Arrange
      const onMoveBlocked = jest.fn().mockResolvedValue("defender's Attack rose!");
      register('テストかぜのり', { isImmuneToMove: () => true, onMoveBlocked });
      const { execute, calculate } = setup({
        move: createMove('ふきとばし', MoveCategory.Status, null),
        defenderAbility: 'テストかぜのり',
      });

      // Act
      const message = await execute();

      // Assert
      expect(calculate).not.toHaveBeenCalled();
      expect(onMoveBlocked).toHaveBeenCalledTimes(1);
      expect(onMoveBlocked.mock.calls[0][0].id).toBe(DEFENDER_ID);
      expect(message).toBe("Used ふきとばし but it had no effect defender's Attack rose!");
    });

    it('onMoveBlocked が null を返したらメッセージを足さない', async () => {
      // Arrange
      register('テストかぜのり', {
        isImmuneToMove: () => true,
        onMoveBlocked: jest.fn().mockResolvedValue(null),
      });
      const { execute } = setup({ defenderAbility: 'テストかぜのり' });

      // Act
      const message = await execute();

      // Assert
      expect(message).toBe('Used ほのおのパンチ but it had no effect');
    });

    it('変化技も無効にできる', async () => {
      // Arrange
      register('テストぼうおん', { isImmuneToMove: (_p, ctx) => ctx?.moveFlags?.has('sound') });
      const onUse = jest.fn().mockResolvedValue(null);
      const { execute } = setup({
        defenderAbility: 'テストぼうおん',
        move: createMove('なきごえ', MoveCategory.Status, null),
        moveEffect: { onUse },
      });

      // Act
      const message = await execute();

      // Assert
      expect(onUse).not.toHaveBeenCalled();
      expect(message).toContain('had no effect');
    });

    it('自分を対象にする技では呼ばれない', async () => {
      // Arrange
      const isImmuneToMove = jest.fn().mockReturnValue(true);
      register('テストぼうおん', { isImmuneToMove });
      const onUse = jest.fn().mockResolvedValue(null);
      const { execute } = setup({
        defenderAbility: 'テストぼうおん',
        move: createMove('とおぼえ', MoveCategory.Status, null),
        moveEffect: { onUse },
      });

      // Act
      await execute();

      // Assert
      expect(isImmuneToMove).not.toHaveBeenCalled();
      expect(onUse).toHaveBeenCalled();
    });

    it('攻撃側がかたやぶりなら無効化されない', async () => {
      // Arrange
      register('テストぼうおん', { isImmuneToMove: () => true });
      register('テストかたやぶり', new MoldBreakerEffect());
      const { execute, calculate } = setup({
        defenderAbility: 'テストぼうおん',
        attackerAbility: 'テストかたやぶり',
      });

      // Act
      await execute();

      // Assert
      expect(calculate).toHaveBeenCalled();
    });
  });

  describe('混乱の自傷', () => {
    const executeConfusionSelfHit = async (attackerAbility?: string): Promise<number> => {
      const { execute, statuses, calculate } = setup({ attackerAbility });
      calculate.mockRestore();
      jest.spyOn(StatusConditionHandler, 'shouldSelfAttackFromConfusion').mockReturnValue(true);
      statuses.set(
        ATTACKER_ID,
        withChanges(statuses.get(ATTACKER_ID)!, { statusCondition: StatusCondition.Confusion }),
      );

      await execute();

      return 100 - (statuses.get(ATTACKER_ID)?.currentHp ?? 100);
    };

    it('テクニシャンを持っていても、特性なしと同じ自傷ダメージになる', async () => {
      // Arrange
      const withoutAbility = await executeConfusionSelfHit();
      jest.restoreAllMocks();

      // Act
      const withTechnician = await executeConfusionSelfHit('テクニシャン');

      // Assert
      expect(withoutAbility).toBe(19);
      expect(withTechnician).toBe(withoutAbility);
    });

    it('isImmuneToType で常に無効にする特性でも、自傷ダメージは0にならない', async () => {
      // Arrange
      register('テストふしぎなまもり', { isImmuneToType: () => true });

      // Act
      const selfDamage = await executeConfusionSelfHit('テストふしぎなまもり');

      // Assert
      expect(selfDamage).toBe(19);
    });
  });

  describe('既存の流れとの互換', () => {
    it('連続技でない場合は1回だけダメージを与え、メッセージに回数を出さない', async () => {
      // Arrange
      const { execute, calculate, statuses } = setup();

      // Act
      const message = await execute();

      // Assert
      expect(calculate).toHaveBeenCalledTimes(1);
      expect(statuses.get(DEFENDER_ID)?.currentHp).toBe(90);
      expect(message).toBe('Used ほのおのパンチ and dealt 10 damage');
    });

    it('やけど状態の攻撃側でもフックの有無にかかわらず計算が呼ばれる', async () => {
      // Arrange
      const { execute, calculateParams, statuses } = setup();
      statuses.set(
        ATTACKER_ID,
        withChanges(statuses.get(ATTACKER_ID)!, { statusCondition: StatusCondition.Burn }),
      );

      // Act
      await execute();

      // Assert
      expect(calculateParams().attacker.statusCondition).toBe(StatusCondition.Burn);
      expect(calculateParams().ignoresBurnPenalty).toBeUndefined();
    });
  });
});
