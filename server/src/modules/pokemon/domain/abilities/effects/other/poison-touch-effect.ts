import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import {
  StatusInflictionOptions,
  canInflictStatus,
  inflictStatus,
} from '../../../battle-events/status-infliction';

/**
 * どくしゅ（Poison Touch）特性の効果
 * 接触技で相手にダメージを与えたとき、30%の確率で相手をどくにする
 *
 * - ヒットごとに判定する（連続技ではヒットのたびに判定）
 * - 相手への追加効果が無効（りんぷん）なら発動しない。てんのめぐみの倍率は掛からない（本家と同じ）
 * - どく・はがねタイプ、すでに状態異常の相手、めんえきなどの特性を持つ相手には効かない
 * 注: エンジンは技の追加効果（onHit）より先に判定する（本家は追加効果のあと）。そのため、状態異常の追加効果を持つ
 *     接触技（ほっぺすりすりなど）では、先にどくにして技自身の状態異常を失敗させることがある
 */
export class PoisonTouchEffect implements IAbilityEffect {
  private static readonly CHANCE = 0.3;
  private static readonly ABILITY_NAME = 'どくしゅ';

  async onSourceDamagingHit(
    holder: BattlePokemonStatus,
    target: BattlePokemonStatus,
    hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext || !hit.isContact || battleContext.secondaryEffectsSuppressed) {
      return null;
    }

    const options: StatusInflictionOptions = {
      source: {
        pokemon: holder,
        abilityName: PoisonTouchEffect.ABILITY_NAME,
        kind: 'ability',
        name: PoisonTouchEffect.ABILITY_NAME,
      },
    };
    if (!(await canInflictStatus(target, StatusCondition.Poison, battleContext, options))) {
      return null;
    }
    if (Math.random() >= PoisonTouchEffect.CHANCE) {
      return null;
    }

    const messages = await inflictStatus(target, StatusCondition.Poison, battleContext, options);
    return [`${PoisonTouchEffect.ABILITY_NAME} activated!`, ...messages].join(' ');
  }
}
