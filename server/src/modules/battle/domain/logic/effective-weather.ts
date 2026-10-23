import { Weather } from '../entities/battle.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';

/**
 * 場の特性を考慮した「効果のある天候」を返す
 *
 * ノーてんき・エアロックのように suppressesWeather が true の特性が場にいる間は、
 * 天候そのものは残るが効果はなくなる。そのため Weather.None を返す。
 *
 * @param weather バトルの天候（battle.weather）
 * @param abilityNames 場にいるポケモンの特性名
 * @returns 効果のある天候
 */
export const resolveEffectiveWeather = (
  weather: Weather | null,
  abilityNames: ReadonlyArray<string | undefined>,
): Weather | null => {
  if (weather === null) {
    return null;
  }
  const suppressed = abilityNames.some(
    name => name !== undefined && AbilityRegistry.get(name)?.suppressesWeather === true,
  );
  return suppressed ? Weather.None : weather;
};

/**
 * 技の BattleContext に入れる天候を返す
 *
 * 使用者の特性に ownMoveWeather（メガソーラー）があれば、場の天候・天候を消す特性に関係なくその天候にする
 * （本家の Pokemon.effectiveWeather が、技を出しているポケモンがメガソーラーなら晴れを返すのと同じ）。
 * なければ resolveEffectiveWeather と同じ
 *
 * @param weather バトルの天候（battle.weather）
 * @param attackerAbilityName 技を使うポケモンの特性名
 * @param defenderAbilityName 技を受けるポケモンの特性名
 * @returns 技の処理で使う天候
 */
export const resolveMoveWeather = (
  weather: Weather | null,
  attackerAbilityName: string | undefined,
  defenderAbilityName: string | undefined,
): Weather | null => {
  const ownMoveWeather =
    attackerAbilityName !== undefined
      ? AbilityRegistry.get(attackerAbilityName)?.ownMoveWeather
      : undefined;
  return (
    ownMoveWeather ?? resolveEffectiveWeather(weather, [attackerAbilityName, defenderAbilityName])
  );
};
