import { Prisma } from '@generated/prisma/client';
import { Ability, AbilityTrigger, AbilityCategory } from '@/modules/pokemon/domain/entities/ability.entity';

/**
 * AbilityのPrismaクエリ結果型
 */
type AbilityData = Prisma.AbilityGetPayload<{}>;

/**
 * AbilityMapper
 * PrismaのAbilityデータをDomain層のAbilityエンティティに変換するMapper
 */
export class AbilityMapper {
  /**
   * PrismaのAbilityデータをDomain層のAbilityエンティティに変換
   */
  static toDomainEntity(abilityData: AbilityData): Ability {
    return new Ability(
      abilityData.id,
      abilityData.name,
      abilityData.nameEn,
      abilityData.description,
      abilityData.triggerEvent as AbilityTrigger,
      abilityData.effectCategory as AbilityCategory,
    );
  }
}

