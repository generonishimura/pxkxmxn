import { Prisma } from '@generated/prisma/client';
import { Move, MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';

/**
 * MoveのPrismaクエリ結果型（include付き）
 */
type MoveWithRelations = Prisma.MoveGetPayload<{
  include: {
    type: true;
  };
}>;

/**
 * MoveMapper
 * PrismaのMoveデータをDomain層のMoveエンティティに変換するMapper
 */
export class MoveMapper {
  /**
   * PrismaのMoveデータをDomain層のMoveエンティティに変換
   */
  static toDomainEntity(moveData: MoveWithRelations): Move {
    const type = new Type(moveData.type.id, moveData.type.name, moveData.type.nameEn);

    return new Move(
      moveData.id,
      moveData.name,
      moveData.nameEn,
      type,
      moveData.category as MoveCategory,
      moveData.power,
      moveData.accuracy,
      moveData.pp,
      moveData.priority,
      moveData.description,
    );
  }
}

