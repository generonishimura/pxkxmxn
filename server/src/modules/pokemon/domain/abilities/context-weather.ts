import { Weather } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from './battle-context.interface';

/**
 * 特性・技の効果が参照すべき天候を返す
 *
 * battleContext.weather にはエンジンが「効果のある天候」（ノーてんき・エアロックが場にいれば None）を入れる。
 * battle.weather を直接読むと天候を消す特性が効かないため、効果側は必ずこの関数で天候を読む。
 *
 * @param battleContext バトルコンテキスト
 * @returns 効果のある天候（不明な場合はnull）
 */
export const getContextWeather = (battleContext?: BattleContext): Weather | null =>
  battleContext?.weather ?? battleContext?.battle?.weather ?? null;
