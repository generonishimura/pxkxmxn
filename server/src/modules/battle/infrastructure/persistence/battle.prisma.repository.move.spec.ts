import type { PrismaService } from '@/shared/prisma/prisma.service';
import { BattlePrismaRepository } from './battle.prisma.repository';

// 生成済みの Prisma Client は読み込み時に @prisma/client の実行環境を必要とする。
// このテストは DB を使わず prisma の各メソッドをモックするので、空のクラスに差し替える
jest.mock('@/shared/prisma/prisma.service', () => ({ PrismaService: class {} }));

describe('BattlePrismaRepository - 技の欄の更新', () => {
  const setup = () => {
    const prisma = {
      battlePokemonMove: {
        update: jest.fn().mockResolvedValue({
          id: 5,
          battlePokemonStatusId: 10,
          moveId: 166,
          currentPp: 1,
          maxPp: 1,
          createdAt: new Date(0),
          updatedAt: new Date(0),
        }),
      },
    };
    const repository = new BattlePrismaRepository(prisma as unknown as PrismaService);
    return { prisma, repository };
  };

  it('PP だけを渡したときは、PP だけを書き換える', async () => {
    // Arrange
    const { prisma, repository } = setup();

    // Act
    await repository.updateBattlePokemonMove(5, { currentPp: 3 });

    // Assert
    expect(prisma.battlePokemonMove.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { currentPp: 3 },
    });
  });

  it('技と最大 PP も渡したときは、技の欄の技を書き換える（スケッチ）', async () => {
    // Arrange
    const { prisma, repository } = setup();

    // Act
    const updated = await repository.updateBattlePokemonMove(5, {
      currentPp: 1,
      moveId: 166,
      maxPp: 1,
    });

    // Assert
    expect(prisma.battlePokemonMove.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { currentPp: 1, moveId: 166, maxPp: 1 },
    });
    expect(updated.moveId).toBe(166);
  });
});
