import { PoisonPointEffect } from './poison-point-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

describe('PoisonPointEffect', () => {
  describe('基本設定', () => {
    it('状態異常がどくである', () => {
      const effect = new PoisonPointEffect();
      expect((effect as any).statusCondition).toBe(StatusCondition.Poison);
    });

    it('確率が30%である', () => {
      const effect = new PoisonPointEffect();
      expect((effect as any).chance).toBe(0.3);
    });

    it('免疫タイプがどく、はがねである', () => {
      const effect = new PoisonPointEffect();
      expect((effect as any).immuneTypes).toEqual(['どく', 'はがね']);
    });
  });
});

