import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * トレーナーの行動DTO
 */
export class TrainerActionDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  trainerId: number;

  @IsInt()
  @Min(1)
  @ValidateIf(o => !o.switchPokemonId)
  @IsNotEmpty({ message: 'Either moveId or switchPokemonId must be provided' })
  moveId?: number;

  @IsInt()
  @Min(1)
  @ValidateIf(o => !o.moveId)
  @IsNotEmpty({ message: 'Either moveId or switchPokemonId must be provided' })
  switchPokemonId?: number;

  /**
   * 技といっしょにメガシンカする（1 回のバトルで 1 回だけ。交代とはいっしょに選べない）
   */
  @IsOptional()
  @IsBoolean()
  megaEvolve?: boolean;
}

/**
 * ExecuteTurnDTO
 * ターン実行リクエストのDTO
 */
export class ExecuteTurnDto {
  @ValidateNested()
  @Type(() => TrainerActionDto)
  @IsNotEmpty()
  trainer1Action: TrainerActionDto;

  @ValidateNested()
  @Type(() => TrainerActionDto)
  @IsNotEmpty()
  trainer2Action: TrainerActionDto;
}

