/**
 * Battleエンティティ
 * バトルのドメインエンティティ
 */
export class Battle {
  constructor(
    public readonly id: number,
    public readonly trainer1Id: number,
    public readonly trainer2Id: number,
    public readonly team1Id: number,
    public readonly team2Id: number,
    public readonly turn: number,
    public readonly weather: Weather | null,
    public readonly field: Field | null,
    public readonly status: BattleStatus,
    public readonly winnerTrainerId: number | null,
  ) {}
}

export enum Weather {
  None = 'None',
  Sun = 'Sun',
  Rain = 'Rain',
  Sandstorm = 'Sandstorm',
  Hail = 'Hail',
}

export enum Field {
  None = 'None',
  ElectricTerrain = 'ElectricTerrain',
  GrassyTerrain = 'GrassyTerrain',
  PsychicTerrain = 'PsychicTerrain',
  MistyTerrain = 'MistyTerrain',
}

export enum BattleStatus {
  Active = 'Active',
  Completed = 'Completed',
  Abandoned = 'Abandoned',
}
