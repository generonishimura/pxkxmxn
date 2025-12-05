import { FlameBodyEffect } from './flame-body-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

describe('FlameBodyEffect', () => {
  describe('基本設定', () => {
    it('状態異常がやけどである', () => {
      const effect = new FlameBodyEffect();
      expect((effect as any).statusCondition).toBe(StatusCondition.Burn);
    });

    it('確率が30%である', () => {
      const effect = new FlameBodyEffect();
      expect((effect as any).chance).toBe(0.3);
    });

    it('免疫タイプがほのおである', () => {
      const effect = new FlameBodyEffect();
      expect((effect as any).immuneTypes).toEqual(['ほのお']);
    });
  });
});

