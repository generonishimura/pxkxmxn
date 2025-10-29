/**
 * Typeエンティティ
 * タイプマスタのドメインエンティティ
 */
export class Type {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly nameEn: string
  ) {}
}
