import { IAbilityEffect } from '../../ability-effect.interface';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * メガソーラー（Mega Sol）特性の効果（メガメガニウム）
 * 自分が使う技を、天候に関係なく晴れのもとで出したものとして扱う
 *
 * 使用者の技の BattleContext.weather を晴れにする（resolveMoveWeather）。そのため次のことが起きる
 * - ほのお技のダメージが 1.5 倍、みず技のダメージが 0.5 倍になる（雨の補正は受けない）
 * - ソーラービーム・ソーラーブレードをためずに出す。エレクトロビームは雨でもためる
 * - ウェザーボールがほのおタイプ・威力 100 になり、こうごうせいなどの回復量が晴れの量になる
 * - ノーてんき・エアロックが場にいても晴れとして扱う
 * 本家（Pokemon Showdown）の Pokemon.effectiveWeather と onWeatherModifyDamage と同じ。
 *
 * 注: 相手の技・ターン終了時の処理・素早さの計算には効かない（本家も、技を出しているポケモンが
 *     メガソーラーのときだけ晴れを返す）。おおあめで、ほのお技が消える判定は変えない（本家と同じ）
 * 注: 本家の「メガソーラーが発動した」というメッセージは出さない
 */
export class MegaSolEffect implements IAbilityEffect {
  readonly ownMoveWeather = Weather.Sun;
}
