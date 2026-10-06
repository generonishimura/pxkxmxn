import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { applyStatChanges } from '../../battle-events/stat-change';
import { tryApplyVolatile } from '../../battle-events/volatile-infliction';
import { StatType, joinStatChangeMessages, moveEffectSource } from './base/base-stat-change-effect';

/**
 * ゴーストタイプ以外が使ったときのランク変化
 */
const NON_GHOST_STAT_CHANGES: ReadonlyArray<{ statType: StatType; rankChange: number }> = [
  { statType: 'attack', rankChange: 1 },
  { statType: 'defense', rankChange: 1 },
  { statType: 'speed', rankChange: -1 },
];

const GHOST_TYPE = 'ゴースト';

/**
 * のろい（Curse）技の効果
 * 使ったポケモンがゴーストタイプかどうかで効果が変わる
 *
 * - ゴーストタイプ以外: 自分の攻撃・防御 +1、素早さ -1
 * - ゴーストタイプ: 相手をのろい状態にし（cursed）、自分の最大 HP の 1/2（切り捨て）を払う
 *   - すでにのろい状態の相手には失敗し、HP も払わない
 *   - 残り HP が足りなければ、のろいをかけて自分はひんしになる（本家と同じ）
 *   - HP を払うのは技以外のダメージではないので、マジックガードでも払う（本家の directDamage）
 *   - ターン終了時に相手の最大 HP の 1/4 を減らすのはエンジンが行う
 *
 * 注: タイプはポケモン本来のタイプで判定する（みずびたしなどの typeOverride は見ない）
 * 注: エンジンはのろいを常に相手を対象にする技として扱う。そのため、ゴーストタイプ以外が使っても、
 *     相手が隠れている（そらをとぶなど）と外れ、相手の特性（おうごんのからだなど）で防がれる。
 *     本家はゴーストタイプ以外なら自分を対象にするので、これらでは止まらない
 */
export class CurseEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const battleRepository = battleContext.battleRepository;
    if (!battleRepository) {
      return null;
    }

    if (!(await this.isGhostType(attacker, battleContext))) {
      const result = await applyStatChanges(attacker, NON_GHOST_STAT_CHANGES, battleContext, {
        source: moveEffectSource(attacker, battleContext),
      });
      return joinStatChangeMessages(result);
    }

    const cursed = await tryApplyVolatile(defender, 'curse', { cursed: true }, battleContext, {
      source: moveEffectSource(attacker, battleContext),
    });
    if (!cursed) {
      return 'But it failed';
    }

    const user = (await battleRepository.findBattlePokemonStatusById(attacker.id)) ?? attacker;
    await battleRepository.updateBattlePokemonStatus(user.id, {
      currentHp: Math.max(0, user.currentHp - Math.floor(user.maxHp / 2)),
    });
    return 'cut its own HP and laid a curse on the target!';
  }

  private async isGhostType(
    pokemon: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<boolean> {
    const trainedPokemon = await battleContext.trainedPokemonRepository?.findById(
      pokemon.trainedPokemonId,
    );
    const typeNames = [
      trainedPokemon?.pokemon.primaryType.name,
      trainedPokemon?.pokemon.secondaryType?.name,
    ];
    return typeNames.includes(GHOST_TYPE);
  }
}
