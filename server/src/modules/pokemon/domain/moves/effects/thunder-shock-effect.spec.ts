import { ThunderShockEffect } from './thunder-shock-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

describe('ThunderShockEffect', () => {
  describe('基本設定', () => {
    it('状態異常がまひである', () => {
      const effect = new ThunderShockEffect();
      expect((effect as any).statusCondition).toBe(StatusCondition.Paralysis);
    });

    it('確率が10%である', () => {
      const effect = new ThunderShockEffect();
      expect((effect as any).chance).toBe(0.1);
    });

    it('免疫タイプがでんきである', () => {
      const effect = new ThunderShockEffect();
      expect((effect as any).immuneTypes).toEqual(['でんき']);
    });
  });
});
