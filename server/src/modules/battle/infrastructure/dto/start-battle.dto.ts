import {
  IsInt,
  Min,
  IsNotEmpty,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * 同じ値でないことを検証するカスタムバリデーター
 */
function IsNotEqual(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotEqual',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          return value !== relatedValue;
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          return `${args.property} must not be equal to ${relatedPropertyName}`;
        },
      },
    });
  };
}

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
  @IsNotEqual('trainer1Id', {
    message: 'Trainer1 ID and Trainer2 ID must be different',
  })
  trainer2Id: number;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  team1Id: number;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  @IsNotEqual('team1Id', {
    message: 'Team1 ID and Team2 ID must be different',
  })
  team2Id: number;
}

