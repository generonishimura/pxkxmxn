/**
 * Trainerエンティティ
 * トレーナーのドメインエンティティ
 */
export class Trainer {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly email: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

