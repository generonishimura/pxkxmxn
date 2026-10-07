import type { Prisma } from '@generated/prisma/client';
import type { PrismaService } from '@/shared/prisma/prisma.service';
import { NotFoundException } from '@/shared/domain/exceptions';
import { BattlePrismaRepository } from './battle.prisma.repository';

// 生成済みの Prisma Client は読み込み時に @prisma/client の実行環境を必要とする。
// このテストは DB を使わず prisma の各メソッドをモックするので、空のクラスに差し替える
jest.mock('@/shared/prisma/prisma.service', () => ({ PrismaService: class {} }));

type BattleRow = Prisma.BattleGetPayload<{}>;
type BattlePokemonStatusRow = Prisma.BattlePokemonStatusGetPayload<{}>;

describe('BattlePrismaRepository - 状態の JSON 列', () => {
  const battleRow = (overrides: Partial<BattleRow> = {}): BattleRow => ({
    id: 1,
    trainer1Id: 1,
    trainer2Id: 2,
    team1Id: 1,
    team2Id: 2,
    turn: 1,
    weather: 'None',
    field: 'None',
    status: 'Active',
    winnerTrainerId: null,
    sideState: {},
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  });

  const statusRow = (overrides: Partial<BattlePokemonStatusRow> = {}): BattlePokemonStatusRow => ({
    id: 10,
    battleId: 1,
    trainedPokemonId: 3,
    trainerId: 1,
    isActive: true,
    currentHp: 100,
    maxHp: 100,
    attackRank: 0,
    defenseRank: 0,
    specialAttackRank: 0,
    specialDefenseRank: 0,
    speedRank: 0,
    accuracyRank: 0,
    evasionRank: 0,
    statusCondition: 'None',
    volatileState: {},
    persistentState: {},
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  });

  const setup = () => {
    // トランザクションの中で使うクライアント。行のロック（$queryRaw）と読み書きを持つ
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      battle: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      battlePokemonStatus: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    const prisma = {
      battle: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      battlePokemonStatus: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)),
    };
    const repository = new BattlePrismaRepository(prisma as unknown as PrismaService);
    return { prisma, tx, repository };
  };

  /**
   * $queryRaw のタグ付きテンプレートに渡された SQL の文字列部分をつなげる
   */
  const lockedSql = (queryRaw: jest.Mock): string => {
    const [strings] = queryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
    return strings.join('?');
  };

  describe('sideState', () => {
    it('読み込んだ行の sideState をドメインの型にして返す', async () => {
      // Arrange
      const { prisma, repository } = setup();
      prisma.battle.findUnique.mockResolvedValue(
        battleRow({
          sideState: { sides: { '1': { reflectTurns: 5 } }, global: { gravityTurns: 3 } },
        }),
      );

      // Act
      const battle = await repository.findById(1);

      // Assert
      expect(battle.sideState).toEqual({
        sides: { '1': { reflectTurns: 5 } },
        global: { gravityTurns: 3 },
      });
    });

    it('読めない sideState は空の状態として返す', async () => {
      // Arrange
      const { prisma, repository } = setup();
      prisma.battle.findUnique.mockResolvedValue(battleRow({ sideState: 'broken' }));

      // Act
      const battle = await repository.findById(1);

      // Assert
      expect(battle.sideState).toEqual({});
    });

    it('バトルを作るときは空の sideState を書き込む', async () => {
      // Arrange
      const { prisma, repository } = setup();
      prisma.battle.create.mockResolvedValue(battleRow());

      // Act
      await repository.create({ trainer1Id: 1, trainer2Id: 2, team1Id: 1, team2Id: 2 });

      // Assert
      expect(prisma.battle.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ sideState: {} }),
      });
    });

    it('更新で sideState を渡したときは書き込む', async () => {
      // Arrange
      const { prisma, repository } = setup();
      prisma.battle.update.mockResolvedValue(battleRow());

      // Act
      await repository.update(1, { sideState: { global: { trickRoomTurns: 5 } } });

      // Assert
      expect(prisma.battle.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { sideState: { global: { trickRoomTurns: 5 } } },
      });
    });

    it('更新で sideState に null を渡したときは、空の状態を書き込む', async () => {
      // Arrange
      const { prisma, repository } = setup();
      prisma.battle.update.mockResolvedValue(battleRow());

      // Act
      await repository.update(1, { sideState: null });

      // Assert
      expect(prisma.battle.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { sideState: {} },
      });
    });

    it('更新で sideState を渡さないときは書き込まない', async () => {
      // Arrange
      const { prisma, repository } = setup();
      prisma.battle.update.mockResolvedValue(battleRow());

      // Act
      await repository.update(1, { turn: 2 });

      // Assert
      expect(prisma.battle.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { turn: 2 } });
    });
  });

  describe('volatileState', () => {
    it('読み込んだ行の volatileState をドメインの型にして返す', async () => {
      // Arrange
      const { prisma, repository } = setup();
      prisma.battlePokemonStatus.findUnique.mockResolvedValue(
        statusRow({ volatileState: { leechSeed: true, encore: { moveId: 12, turns: 3 } } }),
      );

      // Act
      const status = await repository.findBattlePokemonStatusById(10);

      // Assert
      expect(status.volatileState).toEqual({ leechSeed: true, encore: { moveId: 12, turns: 3 } });
    });

    it('一覧で読み込んだ行の知らないキーは捨てて返す', async () => {
      // Arrange
      const { prisma, repository } = setup();
      prisma.battlePokemonStatus.findMany.mockResolvedValue([
        statusRow({ volatileState: { tauntTurns: 2, unknownKey: 1 } }),
      ]);

      // Act
      const [status] = await repository.findBattlePokemonStatusByBattleId(1);

      // Assert
      expect(status.volatileState).toEqual({ tauntTurns: 2 });
    });

    it('場のポケモンを読み込んだときも volatileState を返す', async () => {
      // Arrange
      const { prisma, repository } = setup();
      prisma.battlePokemonStatus.findFirst.mockResolvedValue(
        statusRow({ volatileState: { substituteHp: 25 } }),
      );

      // Act
      const status = await repository.findActivePokemonByBattleIdAndTrainerId(1, 1);

      // Assert
      expect(status.volatileState).toEqual({ substituteHp: 25 });
    });

    it('ポケモンの状態を作るときは空の volatileState を書き込む', async () => {
      // Arrange
      const { prisma, repository } = setup();
      prisma.battlePokemonStatus.create.mockResolvedValue(statusRow());

      // Act
      await repository.createBattlePokemonStatus({
        battleId: 1,
        trainedPokemonId: 3,
        trainerId: 1,
        currentHp: 100,
        maxHp: 100,
      });

      // Assert
      expect(prisma.battlePokemonStatus.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ volatileState: {} }),
      });
    });

    it('更新で volatileState を渡したときは書き込む', async () => {
      // Arrange
      const { prisma, repository } = setup();
      prisma.battlePokemonStatus.update.mockResolvedValue(statusRow());

      // Act
      await repository.updateBattlePokemonStatus(10, { volatileState: { protectCount: 1 } });

      // Assert
      expect(prisma.battlePokemonStatus.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { volatileState: { protectCount: 1 } },
      });
    });

    it('更新で volatileState に null を渡したときは、空の状態を書き込む', async () => {
      // Arrange
      const { prisma, repository } = setup();
      prisma.battlePokemonStatus.update.mockResolvedValue(statusRow());

      // Act
      await repository.updateBattlePokemonStatus(10, { volatileState: null });

      // Assert
      expect(prisma.battlePokemonStatus.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { volatileState: {} },
      });
    });

    it('更新で volatileState を渡さないときは書き込まない', async () => {
      // Arrange
      const { prisma, repository } = setup();
      prisma.battlePokemonStatus.update.mockResolvedValue(statusRow());

      // Act
      await repository.updateBattlePokemonStatus(10, { currentHp: 50 });

      // Assert
      expect(prisma.battlePokemonStatus.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { currentHp: 50 },
      });
    });
  });

  describe('persistentState', () => {
    it('読み込んだ行の persistentState をドメインの型にして返す', async () => {
      // Arrange
      const { prisma, repository } = setup();
      prisma.battlePokemonStatus.findUnique.mockResolvedValue(
        statusRow({ persistentState: { disguiseBusted: true, sleepTurns: 2, unknownKey: 1 } }),
      );

      // Act
      const status = await repository.findBattlePokemonStatusById(10);

      // Assert
      expect(status.persistentState).toEqual({ disguiseBusted: true, sleepTurns: 2 });
    });

    it('読めない persistentState は空の状態として返す', async () => {
      // Arrange
      const { prisma, repository } = setup();
      prisma.battlePokemonStatus.findFirst.mockResolvedValue(
        statusRow({ persistentState: 'broken' }),
      );

      // Act
      const status = await repository.findActivePokemonByBattleIdAndTrainerId(1, 1);

      // Assert
      expect(status.persistentState).toEqual({});
    });

    it('ポケモンの状態を作るときは空の persistentState を書き込む', async () => {
      // Arrange
      const { prisma, repository } = setup();
      prisma.battlePokemonStatus.create.mockResolvedValue(statusRow());

      // Act
      await repository.createBattlePokemonStatus({
        battleId: 1,
        trainedPokemonId: 3,
        trainerId: 1,
        currentHp: 100,
        maxHp: 100,
      });

      // Assert
      expect(prisma.battlePokemonStatus.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ persistentState: {} }),
      });
    });

    it('更新で persistentState を渡したときは書き込む', async () => {
      // Arrange
      const { prisma, repository } = setup();
      prisma.battlePokemonStatus.update.mockResolvedValue(statusRow());

      // Act
      await repository.updateBattlePokemonStatus(10, { persistentState: { iceFaceBroken: true } });

      // Assert
      expect(prisma.battlePokemonStatus.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { persistentState: { iceFaceBroken: true } },
      });
    });

    it('更新で persistentState に null を渡したときは、空の状態を書き込む', async () => {
      // Arrange
      const { prisma, repository } = setup();
      prisma.battlePokemonStatus.update.mockResolvedValue(statusRow());

      // Act
      await repository.updateBattlePokemonStatus(10, { persistentState: null });

      // Assert
      expect(prisma.battlePokemonStatus.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { persistentState: {} },
      });
    });
  });

  describe('patchVolatileState', () => {
    it('最新の行を読み直して patch を当て、ほかのキーを残して書き込む', async () => {
      // Arrange
      const { tx, repository } = setup();
      tx.battlePokemonStatus.findUnique.mockResolvedValue(
        statusRow({ volatileState: { tauntTurns: 3 } }),
      );
      tx.battlePokemonStatus.update.mockResolvedValue(
        statusRow({ volatileState: { tauntTurns: 3, critStageBoost: 2 } }),
      );

      // Act
      const status = await repository.patchVolatileState(10, { critStageBoost: 2 });

      // Assert
      expect(tx.battlePokemonStatus.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { volatileState: { tauntTurns: 3, critStageBoost: 2 } },
      });
      expect(status.volatileState).toEqual({ tauntTurns: 3, critStageBoost: 2 });
    });

    it('null を渡したキーは取り除いて書き込む', async () => {
      // Arrange
      const { tx, repository } = setup();
      tx.battlePokemonStatus.findUnique.mockResolvedValue(
        statusRow({ volatileState: { protection: 'protect', leechSeed: true } }),
      );
      tx.battlePokemonStatus.update.mockResolvedValue(statusRow());

      // Act
      await repository.patchVolatileState(10, { protection: null });

      // Assert
      expect(tx.battlePokemonStatus.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { volatileState: { leechSeed: true } },
      });
    });

    it('読む前に、行を FOR UPDATE でロックする', async () => {
      // Arrange
      const { tx, repository } = setup();
      tx.battlePokemonStatus.findUnique.mockResolvedValue(statusRow());
      tx.battlePokemonStatus.update.mockResolvedValue(statusRow());

      // Act
      await repository.patchVolatileState(10, { leechSeed: true });

      // Assert
      expect(lockedSql(tx.$queryRaw)).toMatch(
        /FROM battle_pokemon_status WHERE id = \? FOR UPDATE/,
      );
      expect(tx.$queryRaw.mock.calls[0][1]).toBe(10);
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        tx.battlePokemonStatus.findUnique.mock.invocationCallOrder[0],
      );
    });

    it('行がないときは NotFoundException を投げ、書き込まない', async () => {
      // Arrange
      const { tx, repository } = setup();
      tx.battlePokemonStatus.findUnique.mockResolvedValue(null);

      // Act
      const result = repository.patchVolatileState(10, { leechSeed: true });

      // Assert
      await expect(result).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.battlePokemonStatus.update).not.toHaveBeenCalled();
    });
  });

  describe('patchPersistentState', () => {
    it('最新の行を読み直して patch を当て、ほかのキーを残して書き込む', async () => {
      // Arrange
      const { tx, repository } = setup();
      tx.battlePokemonStatus.findUnique.mockResolvedValue(
        statusRow({ persistentState: { sleepTurns: 2 } }),
      );
      tx.battlePokemonStatus.update.mockResolvedValue(statusRow());

      // Act
      await repository.patchPersistentState(10, { disguiseBusted: true });

      // Assert
      expect(lockedSql(tx.$queryRaw)).toMatch(
        /FROM battle_pokemon_status WHERE id = \? FOR UPDATE/,
      );
      expect(tx.battlePokemonStatus.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { persistentState: { sleepTurns: 2, disguiseBusted: true } },
      });
    });
  });

  describe('patchSideConditions', () => {
    it('最新の行を読み直し、指定した陣営だけに patch を当てて書き込む', async () => {
      // Arrange
      const { tx, repository } = setup();
      tx.battle.findUnique.mockResolvedValue(
        battleRow({
          sideState: { sides: { '1': { tailwindTurns: 3 } }, global: { gravityTurns: 2 } },
        }),
      );
      tx.battle.update.mockResolvedValue(battleRow());

      // Act
      await repository.patchSideConditions(1, 2, { reflectTurns: 5 });

      // Assert
      expect(lockedSql(tx.$queryRaw)).toMatch(/FROM battles WHERE id = \? FOR UPDATE/);
      expect(tx.$queryRaw.mock.calls[0][1]).toBe(1);
      expect(tx.battle.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          sideState: {
            sides: { '1': { tailwindTurns: 3 }, '2': { reflectTurns: 5 } },
            global: { gravityTurns: 2 },
          },
        },
      });
    });

    it('バトルがないときは NotFoundException を投げ、書き込まない', async () => {
      // Arrange
      const { tx, repository } = setup();
      tx.battle.findUnique.mockResolvedValue(null);

      // Act
      const result = repository.patchSideConditions(1, 2, { reflectTurns: 5 });

      // Assert
      await expect(result).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.battle.update).not.toHaveBeenCalled();
    });
  });

  describe('patchGlobalFieldState', () => {
    it('最新の行を読み直し、両陣営にかかる状態に patch を当てて書き込む', async () => {
      // Arrange
      const { tx, repository } = setup();
      tx.battle.findUnique.mockResolvedValue(
        battleRow({ sideState: { sides: { '1': { mistTurns: 5 } } } }),
      );
      tx.battle.update.mockResolvedValue(
        battleRow({
          sideState: { sides: { '1': { mistTurns: 5 } }, global: { trickRoomTurns: 5 } },
        }),
      );

      // Act
      const battle = await repository.patchGlobalFieldState(1, { trickRoomTurns: 5 });

      // Assert
      expect(tx.battle.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { sideState: { sides: { '1': { mistTurns: 5 } }, global: { trickRoomTurns: 5 } } },
      });
      expect(battle.sideState).toEqual({
        sides: { '1': { mistTurns: 5 } },
        global: { trickRoomTurns: 5 },
      });
    });
  });
  describe('古い行のこんらん・ひるみ', () => {
    it('statusCondition がこんらんの行は、状態異常なしとこんらんの残り回数として読む', async () => {
      // Arrange
      const { prisma, repository } = setup();
      prisma.battlePokemonStatus.findUnique.mockResolvedValue(
        statusRow({ statusCondition: 'Confusion' }),
      );

      // Act
      const status = await repository.findBattlePokemonStatusById(10);

      // Assert
      expect(status?.statusCondition).toBeNull();
      expect(status?.volatileState.confusionTurns).toBe(2);
    });

    it('statusCondition がひるみの行は、状態異常なしとして読む', async () => {
      // Arrange
      const { prisma, repository } = setup();
      prisma.battlePokemonStatus.findUnique.mockResolvedValue(
        statusRow({ statusCondition: 'Flinch' }),
      );

      // Act
      const status = await repository.findBattlePokemonStatusById(10);

      // Assert
      expect(status?.statusCondition).toBeNull();
      expect(status?.volatileState.flinched).toBeUndefined();
    });

    it('部分更新では、古い行のこんらんを volatileState に移し、statusCondition を None にする', async () => {
      // Arrange
      const { tx, repository } = setup();
      tx.battlePokemonStatus.findUnique.mockResolvedValue(
        statusRow({ statusCondition: 'Confusion' }),
      );
      tx.battlePokemonStatus.update.mockResolvedValue(statusRow());

      // Act
      await repository.patchVolatileState(10, { tauntTurns: 3 });

      // Assert
      expect(tx.battlePokemonStatus.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { volatileState: { confusionTurns: 2, tauntTurns: 3 }, statusCondition: 'None' },
      });
    });
  });
});
