import { IsString, IsEmail, IsOptional, MinLength, MaxLength } from 'class-validator';

/**
 * UpdateTrainerDTO
 * トレーナー更新リクエストのDTO
 */
export class UpdateTrainerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}

