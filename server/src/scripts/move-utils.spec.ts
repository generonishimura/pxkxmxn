/**
 * move-utils のユニットテスト
 */

import { hasSpecialEffect } from './move-utils';

describe('hasSpecialEffect', () => {
  it('descriptionに状態異常キーワードが含まれていればtrueを返す', () => {
    const move = { description: 'May Burn the target', category: 'Physical' };
    expect(hasSpecialEffect(move)).toBe(true);
  });

  it('categoryがStatusの場合は説明がなくてもtrueを返す', () => {
    const move = { description: null, category: 'Status' };
    expect(hasSpecialEffect(move)).toBe(true);
  });

  it('該当キーワードがなく物理/特殊技の場合はfalseを返す', () => {
    const move = { description: 'A strong tackle.', category: 'Physical' };
    expect(hasSpecialEffect(move)).toBe(false);
  });
});
