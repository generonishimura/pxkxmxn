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
