import { Regulation } from '../../domain/regulations/regulation';

/**
 * has がいつも true を返す Set（どの値も入っているとみなす）
 */
class AnyValueSet<T> extends Set<T> {
  override has(): boolean {
    return true;
  }
}

/**
 * どのポケモン・持ち物も弾かない、テスト用のレギュレーション
 * バトルの始まりの状態を見るテストで使う（レギュレーションで使えないポケモンや、テスト用の持ち物を手持ちに入れるため）。
 * レギュレーションで弾くことは start-battle.use-case.team-rule.spec.ts で確かめる
 */
export const UNRESTRICTED_REGULATION: Regulation = {
  name: 'UNRESTRICTED',
  allowedNationalDex: new AnyValueSet<number>(),
  allowedItems: new AnyValueSet<string>(),
};
