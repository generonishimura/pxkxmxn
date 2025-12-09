import { StaticEffect } from './static-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

describe('StaticEffect', () => {
  describe('基本設定', () => {
    it('状態異常がまひである', () => {
      const effect = new StaticEffect();
      expect((effect as any).statusCondition).toBe(StatusCondition.Paralysis);
    });

    it('確率が30%である', () => {
      const effect = new StaticEffect();
      expect((effect as any).chance).toBe(0.3);
    });

    it('免疫タイプがでんきである', () => {
      const effect = new StaticEffect();
      expect((effect as any).immuneTypes).toEqual(['でんき']);
    });
  });
});

