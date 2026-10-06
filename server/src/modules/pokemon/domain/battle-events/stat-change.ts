import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../abilities/battle-context.interface';
import type { StatType } from '../moves/effects/base/base-stat-change-effect';
import type { IAbilityEffect } from '../abilities/ability-effect.interface';
import { EffectSource } from './effect-source';
import { getAbilityEffect, isIgnoredByMoldBreaker, resolveAbilityName } from './ability-lookup';

/**
 * 1つの能力ランクの変化
 */
export interface StatChange {
  readonly statType: StatType;
  /** ランクの変化量（正の値で上昇、負の値で下降） */
  readonly rankChange: number;
}

/**
 * 能力ランクを変えるときのオプション
 */
export interface StatChangeOptions {
  /**
   * 変化を起こしたもの（技・特性と、そのポケモン）
   * source.pokemon が対象と違えば「相手が起こした変化」として扱う
   */
  readonly source?: EffectSource;

  /**
   * ミラーアーマーで跳ね返された変化か（もう一度は跳ね返さない）
   */
  readonly reflected?: boolean;
}

/**
 * 能力ランクの変化の結果
 */
export interface StatChangeResult {
  /** 実際に変わった量（特性による変換と -6〜+6 の上限を反映したもの） */
  readonly applied: readonly StatChange[];
  /** ミラーアーマーで相手に跳ね返した変化 */
  readonly reflected: readonly StatChange[];
  /** 変化のあとに反応した特性のメッセージ */
  readonly messages: readonly string[];
}

const RANK_PROPS = {
  attack: 'attackRank',
  defense: 'defenseRank',
  specialAttack: 'specialAttackRank',
  specialDefense: 'specialDefenseRank',
  speed: 'speedRank',
  accuracy: 'accuracyRank',
  evasion: 'evasionRank',
} as const satisfies Record<StatType, keyof BattlePokemonStatus>;

type RankProp = (typeof RANK_PROPS)[StatType];

const MIN_RANK = -6;
const MAX_RANK = 6;

const EMPTY_RESULT: StatChangeResult = { applied: [], reflected: [], messages: [] };

/**
 * ステータスタイプから表示名へのマッピング
 */
export const STAT_NAME_MAP: Readonly<Record<StatType, string>> = {
  attack: 'Attack',
  defense: 'Defense',
  specialAttack: 'Special Attack',
  specialDefense: 'Special Defense',
  speed: 'Speed',
  accuracy: 'Accuracy',
  evasion: 'Evasion',
};

/**
 * 実際に変わった量を "Attack rose!" / "Speed fell!" の形のメッセージにする
 */
export const formatStatChanges = (changes: readonly StatChange[]): string[] =>
  changes.map(
    change => `${STAT_NAME_MAP[change.statType]} ${change.rankChange > 0 ? 'rose' : 'fell'}!`,
  );

/**
 * 能力ランクを変える。能力ランクを変える効果はこれを使う
 *
 * 1. 対象の特性の modifyIncomingStatChange で変化量を変える（たんじゅん・あまのじゃく・ばんけん）
 * 2. 相手が起こした低下は、対象の特性の reflectsStatDrops（ミラーアーマー）で相手に返し、
 *    canReceiveStatChange（クリアボディなど）で防ぐ
 *    1〜2 の対象の特性は、相手の技による変化なら使い手のかたやぶりで無視される
 * 3. -6〜+6 に収めて書き込む
 * 4. 変化したら、対象の特性の onStatChanged（まけんき・びびり）と、
 *    相手の特性の onOpponentStatChanged（びんじょう）を呼ぶ
 *
 * ミラーアーマーで返したときは、messages に「跳ね返したこと」と相手のランクの変化を入れる
 *
 * @param target ランクが変わるポケモン（最新の状態を渡す）
 * @param changes 変化の一覧
 */
export const applyStatChanges = async (
  target: BattlePokemonStatus,
  changes: readonly StatChange[],
  battleContext: BattleContext,
  options: StatChangeOptions = {},
): Promise<StatChangeResult> => {
  if (!battleContext.battleRepository || target.currentHp <= 0) {
    return EMPTY_RESULT;
  }

  const source = options.source;
  const fromOpponent = source?.pokemon !== undefined && source.pokemon.id !== target.id;
  const targetAbilityName = await resolveAbilityName(target, battleContext);
  const targetAbility = await getAbilityEffect(targetAbilityName);
  const moldBroken =
    fromOpponent &&
    source.kind === 'move' &&
    (await isIgnoredByMoldBreaker(
      source.abilityName ?? (await resolveAbilityName(source.pokemon, battleContext)),
      targetAbilityName,
    ));
  // 変化を変える・防ぐ特性（かたやぶりで無視される）
  const gate = moldBroken ? undefined : targetAbility;

  const ranks: Partial<Record<RankProp, number>> = {};
  const applied: StatChange[] = [];
  const reflected: StatChange[] = [];
  for (const change of changes) {
    const prop = RANK_PROPS[change.statType];
    const rankChange =
      gate?.modifyIncomingStatChange?.(target, change, source, battleContext) ?? change.rankChange;
    const currentRank = ranks[prop] ?? target[prop];
    if (rankChange < 0 && fromOpponent) {
      if (gate?.reflectsStatDrops === true && !options.reflected) {
        if (currentRank > MIN_RANK) {
          reflected.push({ statType: change.statType, rankChange });
        }
        continue;
      }
      const canReceive = gate?.canReceiveStatChange?.(
        target,
        change.statType,
        rankChange,
        battleContext,
        source,
      );
      if (canReceive === false) {
        continue;
      }
    }

    const newRank = Math.max(MIN_RANK, Math.min(MAX_RANK, currentRank + rankChange));
    if (newRank === currentRank) {
      continue;
    }
    ranks[prop] = newRank;
    applied.push({ statType: change.statType, rankChange: newRank - currentRank });
  }

  const messages: string[] = [];
  if (applied.length > 0) {
    await battleContext.battleRepository.updateBattlePokemonStatus(target.id, ranks);
  }

  // ミラーアーマー: 跳ね返した低下を、起こした相手に与える（この特性が起こした変化として扱う）
  if (reflected.length > 0 && fromOpponent) {
    const latestSource =
      (await battleContext.battleRepository.findBattlePokemonStatusById(source.pokemon.id)) ??
      source.pokemon;
    const result = await applyStatChanges(latestSource, reflected, battleContext, {
      source: {
        pokemon: target,
        abilityName: targetAbilityName,
        kind: 'ability',
        name: targetAbilityName,
      },
      reflected: true,
    });
    // 跳ね返したことと、相手のランクの変化を伝える（例: "ミラーアーマー reflected the stat drop! Accuracy fell!"）
    messages.push(
      `${targetAbilityName} reflected the stat drop!`,
      ...formatStatChanges(result.applied),
      ...result.messages,
    );
  }

  if (applied.length > 0) {
    messages.push(
      ...(await runStatChangedHooks({ target, applied, battleContext, source, targetAbility })),
    );
  }

  return { applied, reflected, messages };
};

/**
 * 変化のあとの特性を呼ぶ（対象の onStatChanged → 相手の onOpponentStatChanged）
 * これらの特性はかたやぶりでは無視されない
 */
const runStatChangedHooks = async (params: {
  target: BattlePokemonStatus;
  applied: readonly StatChange[];
  battleContext: BattleContext;
  source: EffectSource | undefined;
  targetAbility: IAbilityEffect | undefined;
}): Promise<string[]> => {
  const { target, applied, battleContext, source, targetAbility } = params;
  const repository = battleContext.battleRepository;
  if (!repository) {
    return [];
  }
  const observer = findOpponent(target, battleContext, source);
  const observerAbility = observer
    ? await getAbilityEffect(await resolveAbilityName(observer, battleContext))
    : undefined;
  if (!targetAbility?.onStatChanged && !observerAbility?.onOpponentStatChanged) {
    return [];
  }

  const latestTarget = (await repository.findBattlePokemonStatusById(target.id)) ?? target;
  const messages: Array<string | null | undefined> = [];
  messages.push(await targetAbility?.onStatChanged?.(latestTarget, applied, source, battleContext));
  if (observer && observerAbility?.onOpponentStatChanged) {
    const latestObserver = (await repository.findBattlePokemonStatusById(observer.id)) ?? observer;
    if (latestObserver.currentHp > 0) {
      messages.push(
        await observerAbility.onOpponentStatChanged(
          latestObserver,
          latestTarget,
          applied,
          source,
          battleContext,
        ),
      );
    }
  }
  return messages.filter((message): message is string => Boolean(message));
};

/**
 * 対象の相手（シングルバトルで向かい合うポケモン）を探す
 * 相手が起こした変化ならその相手、技の実行中ならコンテキストの attacker / defender
 * 注: 場に出たとき・ターン終了時に自分で起こした変化では相手がわからないため、びんじょうは反応しない
 */
const findOpponent = (
  target: BattlePokemonStatus,
  battleContext: BattleContext,
  source: EffectSource | undefined,
): BattlePokemonStatus | undefined => {
  if (source?.pokemon && source.pokemon.id !== target.id) {
    return source.pokemon;
  }
  if (battleContext.attacker?.id === target.id) {
    return battleContext.defender;
  }
  if (battleContext.defender?.id === target.id) {
    return battleContext.attacker;
  }
  return undefined;
};
