import type { SemiInvulnerableKind } from '@/modules/battle/domain/state/volatile-state';
import { MOVE_BEHAVIOR_TABLE } from './move-behavior-table';
// 急所ランク・まもる系の仕組み（Issue #102 #103 #107 #108 #111 #120 #135 一部）
import { EXTRA_MOVE_BEHAVIOR_TABLE } from './move-extra-behavior-table';

/**
 * エンジンが使う技の性質（Showdown の flags などから作った表。move-behavior-table.ts）
 * - snatch: よこどりで奪われる
 * - dance: おどり技（おどりこ）
 * - bypassSubstitute: みがわりを貫通する（音技を含む）
 * - charge: 1 ターンためてから出す技（ソーラービーム・そらをとぶなど）
 * - recharge: 出したあと次のターンは動けない技（はかいこうせんなど）
 * - lockedMove: 2〜3 ターン出し続け、終わるとこんらんする技（あばれる・げきりんなど）
 * - futureMove: 2 ターン後に当たる技（みらいよち・はめつのねがい）
 * - failCopycat / failEncore / failInstruct / failMeFirst / failMimic: まねっこ・アンコール・さいはい・
 *   さきどり・ものまねの対象にできない
 * - noAssist / noSleepTalk / noSketch: ねこのて・ねごと・スケッチで選ばれない
 * - metronome: ゆびをふるで出る（第9世代で使える技だけ）
 * - mirror: オウムがえしでまねできる
 * - cantUseTwice: 続けて出せない（デカハンマー・ブラッドムーン）
 * - mustPressure: 相手を対象にしないがプレッシャーで PP が余分に減る
 * - reflectable: マジックコート・マジックミラーではね返せる
 * - gravity: じゅうりょくの間は出せない
 * - defrost: 使用者のこおりを溶かして出せる
 * - sleepUsable: ねむっていても出せる（いびき・ねごと）
 * - 急所・まもる系・対象の範囲（ExtraMoveBehavior。move-extra-behavior-table.ts）
 */
export type MoveBehavior =
  | 'snatch'
  | 'dance'
  | 'bypassSubstitute'
  | 'charge'
  | 'recharge'
  | 'lockedMove'
  | 'futureMove'
  | 'failCopycat'
  | 'failEncore'
  | 'failInstruct'
  | 'failMeFirst'
  | 'failMimic'
  | 'noAssist'
  | 'noSleepTalk'
  | 'noSketch'
  | 'metronome'
  | 'mirror'
  | 'cantUseTwice'
  | 'mustPressure'
  | 'reflectable'
  | 'gravity'
  | 'defrost'
  | 'sleepUsable'
  | ExtraMoveBehavior;

/**
 * 急所・まもる系・対象の範囲の性質（move-extra-behavior-table.ts）
 * - highCritRatio: 急所ランク +1（つじぎり・ストーンエッジなど）
 * - alwaysCrit: 必ず急所（こおりのいぶき・あんこくきょうだなど）
 * - noProtect: 相手を対象にするが、まもる系で防げない（フェイント・ほえる・ゴーストダイブなど）
 * - breaksProtect: 当たると相手のまもる系・ワイドガードなどを解く（フェイント・シャドーダイブなど）
 * - spread: 相手全体・自分以外全体を対象にする（じしん・なみのり・なきごえなど。ワイドガードで防がれる）
 */
export type ExtraMoveBehavior =
  | 'highCritRatio'
  | 'alwaysCrit'
  | 'noProtect'
  | 'breaksProtect'
  | 'spread';

const EMPTY_BEHAVIORS: ReadonlySet<MoveBehavior> = new Set<MoveBehavior>();

/**
 * 技名ごとの性質の一覧（MOVE_BEHAVIOR_TABLE に EXTRA_MOVE_BEHAVIOR_TABLE を足したもの）
 */
const ALL_MOVE_BEHAVIORS: ReadonlyArray<readonly [string, readonly MoveBehavior[]]> = (() => {
  const merged = new Map<string, MoveBehavior[]>(
    MOVE_BEHAVIOR_TABLE.map(([moveName, behaviors]) => [moveName, [...behaviors]]),
  );
  for (const [behavior, moveNames] of Object.entries(EXTRA_MOVE_BEHAVIOR_TABLE) as Array<
    [ExtraMoveBehavior, readonly string[]]
  >) {
    for (const moveName of moveNames) {
      merged.set(moveName, [...(merged.get(moveName) ?? []), behavior]);
    }
  }
  return [...merged.entries()];
})();

const BEHAVIORS_BY_MOVE_NAME: ReadonlyMap<string, ReadonlySet<MoveBehavior>> = new Map(
  ALL_MOVE_BEHAVIORS.map(([moveName, behaviors]) => [moveName, new Set(behaviors)]),
);

/**
 * ため技のうち、ためている間に姿を隠す技（そらをとぶなど）と、隠れ方
 */
const SEMI_INVULNERABLE_MOVES: ReadonlyMap<string, SemiInvulnerableKind> = new Map([
  ['そらをとぶ', 'air'], // Fly
  ['とびはねる', 'air'], // Bounce
  ['フリーフォール', 'air'], // Sky Drop
  ['あなをほる', 'underground'], // Dig
  ['ダイビング', 'underwater'], // Dive
  ['シャドーダイブ', 'vanished'], // Shadow Force
  ['ゴーストダイブ', 'vanished'], // Phantom Force
]);

/**
 * 隠れている相手にも当たる技（Showdown の onInvulnerability の例外）と、ダメージが 2 倍になる技
 */
const HITS_SEMI_INVULNERABLE: Readonly<
  Record<
    SemiInvulnerableKind,
    { readonly hits: readonly string[]; readonly doubled: readonly string[] }
  >
> = {
  air: {
    hits: [
      'かぜおこし', // Gust
      'たつまき', // Twister
      'かみなり', // Thunder
      'ぼうふう', // Hurricane
      'スカイアッパー', // Sky Uppercut
      'うちおとす', // Smack Down
      'サウザンアロー', // Thousand Arrows
    ],
    doubled: ['かぜおこし', 'たつまき'],
  },
  underground: {
    hits: ['じしん', 'マグニチュード'], // Earthquake, Magnitude
    doubled: ['じしん', 'マグニチュード'],
  },
  underwater: {
    hits: ['なみのり', 'うずしお'], // Surf, Whirlpool
    doubled: ['なみのり', 'うずしお'],
  },
  vanished: { hits: [], doubled: [] },
};

/**
 * 技名から、エンジンが使う技の性質を引くドメインの表
 */
export class MoveBehaviors {
  /**
   * 技名に対応する性質の集合を返す（表にない技は空集合）
   * @param moveName DB の技名（日本語）
   */
  static get(moveName: string): ReadonlySet<MoveBehavior> {
    return BEHAVIORS_BY_MOVE_NAME.get(moveName) ?? EMPTY_BEHAVIORS;
  }

  /**
   * 技が指定の性質を持つかどうか
   */
  static has(moveName: string, behavior: MoveBehavior): boolean {
    return MoveBehaviors.get(moveName).has(behavior);
  }

  /**
   * 指定の性質を持つ技名の一覧（ゆびをふるの候補など）
   */
  static namesWith(behavior: MoveBehavior): readonly string[] {
    return ALL_MOVE_BEHAVIORS.filter(([, behaviors]) => behaviors.includes(behavior)).map(
      ([moveName]) => moveName,
    );
  }

  /**
   * ためている間に姿を隠す技なら、その隠れ方を返す（そらをとぶは 'air'）
   */
  static semiInvulnerableKind(moveName: string): SemiInvulnerableKind | undefined {
    return SEMI_INVULNERABLE_MOVES.get(moveName);
  }

  /**
   * 隠れている相手（kind）に、この技が当たるかどうか
   */
  static hitsSemiInvulnerable(kind: SemiInvulnerableKind, moveName: string): boolean {
    return HITS_SEMI_INVULNERABLE[kind].hits.includes(moveName);
  }

  /**
   * 隠れている相手（kind）に当てたとき、ダメージが 2 倍になる技かどうか（そらをとぶ中のかぜおこしなど）
   */
  static doublesAgainstSemiInvulnerable(kind: SemiInvulnerableKind, moveName: string): boolean {
    return HITS_SEMI_INVULNERABLE[kind].doubled.includes(moveName);
  }
}
