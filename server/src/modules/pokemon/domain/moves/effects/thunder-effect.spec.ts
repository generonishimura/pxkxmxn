import { ThunderEffect } from './thunder-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

describe('ThunderEffect', () => {
  describe('基本設定', () => {
    it('状態異常がまひである', () => {
      const effect = new ThunderEffect();
      expect((effect as any).statusCondition).toBe(StatusCondition.Paralysis);
    });

    it('確率が30%である', () => {
      const effect = new ThunderEffect();
      expect((effect as any).chance).toBe(0.3);
    });

    it('免疫タイプがでんきである', () => {
      const effect = new ThunderEffect();
      expect((effect as any).immuneTypes).toEqual(['でんき']);
    });
  });
});
