import { StatusCondition } from '../entities/status-condition.enum';
import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { StatePatch } from '../state/state-field-parser';
import { VolatileState } from '../state/volatile-state';

/**
 * StatusCondition のうち、状態異常の欄（statusCondition）ではなく volatileState に置くもの
 * - こんらん（Confusion）: volatileState.confusionTurns
 * - ひるみ（Flinch）: volatileState.flinched
 *
 * どちらも状態異常（やけど・まひなど）と同時に持てる。StatusCondition の値は、付与するときの
 * 「何を付与するか」の名前としてだけ使う（canInflictStatus / inflictStatus / canReceiveStatusCondition）
 */
const VOLATILE_STATUS_CONDITIONS: ReadonlySet<StatusCondition> = new Set([
  StatusCondition.Confusion,
  StatusCondition.Flinch,
]);

/**
 * こんらんの残り回数の最小値と最大値（本家と同じ 2〜5）
 * 技を出そうとするたびに 1 減らし、0 になったらこんらんが解けてそのまま技を出す。
 * そのため、こんらんした状態で行動するのは 1〜4 回になる
 */
export const CONFUSION_MIN_TURNS = 2;
export const CONFUSION_MAX_TURNS = 5;

/**
 * volatileState に置く StatusCondition（こんらん・ひるみ）かどうか
 */
export const isVolatileStatusCondition = (status: StatusCondition): boolean =>
  VOLATILE_STATUS_CONDITIONS.has(status);

/**
 * こんらんの残り回数を決める（2〜5 の一様乱数）
 * @param random 0 以上 1 未満の乱数（テスト用に差し替えられる）
 */
export const rollConfusionTurns = (random: number = Math.random()): number =>
  CONFUSION_MIN_TURNS + Math.floor(random * (CONFUSION_MAX_TURNS - CONFUSION_MIN_TURNS + 1));

/**
 * こんらんしているか
 */
export const isConfused = (pokemon: BattlePokemonStatus): boolean =>
  pokemon.volatileState.confusionTurns !== undefined;

/**
 * このターンにひるんでいるか
 */
export const hasFlinched = (pokemon: BattlePokemonStatus): boolean =>
  pokemon.volatileState.flinched === true;

/**
 * volatileState に置く StatusCondition をすでに持っているか
 * こんらん・ひるみ以外を渡したときは false
 */
export const hasVolatileStatusCondition = (
  pokemon: BattlePokemonStatus,
  status: StatusCondition,
): boolean => {
  switch (status) {
    case StatusCondition.Confusion:
      return isConfused(pokemon);
    case StatusCondition.Flinch:
      return hasFlinched(pokemon);
    default:
      return false;
  }
};

/**
 * volatileState に置く StatusCondition を付与する patch を返す
 * こんらんは残り回数を 2〜5 で決める。こんらん・ひるみ以外を渡したときは空の patch
 */
export const volatileStatusConditionPatch = (
  status: StatusCondition,
  random: number = Math.random(),
): StatePatch<VolatileState> => {
  switch (status) {
    case StatusCondition.Confusion:
      return { confusionTurns: rollConfusionTurns(random) };
    case StatusCondition.Flinch:
      return { flinched: true };
    default:
      return {};
  }
};

/**
 * 古い行のこんらんの残り回数
 * 古い行は経過ターン数をメモリ上で数えていたので、残り回数がわからない。
 * 2 にすると、次に技を出そうとしたときはまだこんらんしていて、その次で解ける
 */
export const LEGACY_CONFUSION_TURNS = 2;

/**
 * 古い行の statusCondition にこんらん・ひるみが入っているときの読み方
 * こんらん・ひるみは volatileState に移したので、古い行も次のように読む
 * - こんらん: statusCondition はなし、confusionTurns がなければ LEGACY_CONFUSION_TURNS にする
 * - ひるみ: statusCondition はなし（ひるみはそのターンだけなので持ち越さない）
 * それ以外はそのまま返す
 */
export const normalizeLegacyStatusCondition = (
  statusCondition: StatusCondition | null,
  volatileState: VolatileState,
): { statusCondition: StatusCondition | null; volatileState: VolatileState } => {
  if (statusCondition === StatusCondition.Confusion) {
    return {
      statusCondition: null,
      volatileState:
        volatileState.confusionTurns === undefined
          ? { ...volatileState, confusionTurns: LEGACY_CONFUSION_TURNS }
          : volatileState,
    };
  }
  if (statusCondition === StatusCondition.Flinch) {
    return { statusCondition: null, volatileState };
  }
  return { statusCondition, volatileState };
};

/**
 * statusCondition の値が、古い行のこんらん・ひるみかどうか（書き込むときに None に直すため）
 */
export const isLegacyVolatileStatusCondition = (statusCondition: string | null): boolean =>
  statusCondition === StatusCondition.Confusion || statusCondition === StatusCondition.Flinch;
