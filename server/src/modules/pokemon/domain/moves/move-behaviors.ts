import type { SemiInvulnerableKind } from '@/modules/battle/domain/state/volatile-state';
import { MOVE_BEHAVIOR_TABLE } from './move-behavior-table';

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
  | 'sleepUsable';

const EMPTY_BEHAVIORS: ReadonlySet<MoveBehavior> = new Set<MoveBehavior>();

const BEHAVIORS_BY_MOVE_NAME: ReadonlyMap<string, ReadonlySet<MoveBehavior>> = new Map(
  MOVE_BEHAVIOR_TABLE.map(([moveName, behaviors]) => [moveName, new Set(behaviors)]),
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
    return MOVE_BEHAVIOR_TABLE.filter(([, behaviors]) => behaviors.includes(behavior)).map(
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
