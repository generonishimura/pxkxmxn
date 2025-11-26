import { IsInt, Min, IsNotEmpty } from 'class-validator';

/**
 * StartBattleDTO
 * バトル開始リクエストのDTO
 */
export class StartBattleDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  trainer1Id: number;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  trainer2Id: number;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  team1Id: number;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  team2Id: number;
}

