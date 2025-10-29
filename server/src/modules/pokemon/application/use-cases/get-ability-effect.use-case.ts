import { Injectable, Inject } from '@nestjs/common';
import { IAbilityRepository, ABILITY_REPOSITORY_TOKEN } from '../../domain/pokemon.repository.interface';
import { AbilityRegistry } from '../../domain/abilities/ability-registry';
import { IAbilityEffect } from '../../domain/abilities/ability-effect.interface';

/**
 * 特性効果取得ユースケース
 * 特性名から対応するロジック（効果）を取得する
 *
 * このユースケースは、Strategy/レジストリパターンの利用例を示す。
 * DBから取得した特性のnameをキーとして、アプリケーション側で管理している
 * ロジック（IAbilityEffect）を取得する。
 */
@Injectable()
export class GetAbilityEffectUseCase {
  constructor(
    @Inject(ABILITY_REPOSITORY_TOKEN)
    private readonly abilityRepository: IAbilityRepository,
  ) {}

  /**
   * 特性名からロジックを取得
   * @param abilityName 特性名（DBのnameフィールド）
   * @returns 特性ロジックインスタンス、または null
   */
  async execute(abilityName: string): Promise<IAbilityEffect | null> {
    // DBから特性情報を取得（メタデータ確認用）
    const ability = await this.abilityRepository.findByName(abilityName);
    if (!ability) {
      return null;
    }

    // レジストリからロジックを取得
    // DBのnameをキーとして、アプリケーション側で管理しているロジッククラスを取得
    const effect = AbilityRegistry.get(ability.name);
    return effect || null;
  }

  /**
   * 特性IDからロジックを取得
   * @param abilityId 特性ID
   * @returns 特性ロジックインスタンス、または null
   */
  async executeById(abilityId: number): Promise<IAbilityEffect | null> {
    const ability = await this.abilityRepository.findById(abilityId);
    if (!ability) {
      return null;
    }

    const effect = AbilityRegistry.get(ability.name);
    return effect || null;
  }
}

