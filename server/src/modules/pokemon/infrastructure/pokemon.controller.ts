import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { GetPokemonByIdUseCase } from '../application/use-cases/get-pokemon-by-id.use-case';
import { GetAbilityEffectUseCase } from '../application/use-cases/get-ability-effect.use-case';

/**
 * PokemonController
 * HTTPリクエストを処理し、ユースケースを呼び出す
 */
@Controller('pokemon')
export class PokemonController {
  constructor(
    private readonly getPokemonByIdUseCase: GetPokemonByIdUseCase,
    private readonly getAbilityEffectUseCase: GetAbilityEffectUseCase,
  ) {}

  /**
   * IDでポケモンを取得
   * GET /pokemon/:id
   */
  @Get(':id')
  async getPokemonById(@Param('id', ParseIntPipe) id: number) {
    const pokemon = await this.getPokemonByIdUseCase.execute(id);
    if (!pokemon) {
      return { message: 'Pokemon not found' };
    }
    return pokemon;
  }

  /**
   * 特性名から効果ロジックを取得（レジストリパターンの利用例）
   * GET /pokemon/ability/:name/effect
   */
  @Get('ability/:name/effect')
  async getAbilityEffect(@Param('name') name: string) {
    const effect = await this.getAbilityEffectUseCase.execute(name);
    if (!effect) {
      return { message: 'Ability or effect not found' };
    }

    // 効果クラス名と利用可能なメソッドを返す（デモ用）
    return {
      abilityName: name,
      effectClassName: effect.constructor.name,
      availableMethods: {
        onEntry: typeof effect.onEntry === 'function',
        modifyDamage: typeof effect.modifyDamage === 'function',
        modifyDamageDealt: typeof effect.modifyDamageDealt === 'function',
        onTurnEnd: typeof effect.onTurnEnd === 'function',
        onSwitchOut: typeof effect.onSwitchOut === 'function',
        passiveEffect: typeof effect.passiveEffect === 'function',
      },
    };
  }
}

