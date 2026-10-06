import type { Prisma } from '@generated/prisma/client';
import type { PrismaService } from '@/shared/prisma/prisma.service';
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
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  });

  const setup = () => {
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
    };
    const repository = new BattlePrismaRepository(prisma as unknown as PrismaService);
    return { prisma, repository };
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
});
