import { IsString, IsEmail, IsOptional, MinLength, MaxLength } from 'class-validator';

/**
 * CreateTrainerDTO
 * トレーナー作成リクエストのDTO
 */
export class CreateTrainerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}

