import { Type } from './type.entity';

/**
 * MoveCategory: 技のカテゴリ（物理、特殊、変化）
 */
export enum MoveCategory {
  Physical = 'Physical',
  Special = 'Special',
  Status = 'Status',
}

/**
 * Moveエンティティ
 * 技のドメインエンティティ
 */
export class Move {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly nameEn: string,
    public readonly type: Type,
    public readonly category: MoveCategory,
    public readonly power: number | null, // 変化技の場合はnull
    public readonly accuracy: number | null, // 必中技の場合はnull
    public readonly pp: number,
    public readonly priority: number, // 優先度
    public readonly description: string | null,
  ) {}
}

