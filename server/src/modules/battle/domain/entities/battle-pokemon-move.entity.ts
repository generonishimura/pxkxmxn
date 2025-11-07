/**
 * BattlePokemonMoveエンティティ
 * バトル中のポケモンが持つ技とPPを管理
 */
export class BattlePokemonMove {
  constructor(
    public readonly id: number,
    public readonly battlePokemonStatusId: number,
    public readonly moveId: number,
    public readonly currentPp: number,
    public readonly maxPp: number,
  ) {}

  /**
   * PPが0かどうか
   */
  isPpExhausted(): boolean {
    return this.currentPp <= 0;
  }

  /**
   * PPを消費
   * @param amount 消費するPP（デフォルト: 1）
   * @returns 消費後のPP
   */
  consumePp(amount: number = 1): number {
    return Math.max(0, this.currentPp - amount);
  }
}

