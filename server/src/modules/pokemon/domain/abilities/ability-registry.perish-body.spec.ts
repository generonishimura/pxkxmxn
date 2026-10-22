import { AbilityRegistry } from './ability-registry';
import { PerishBodyEffect } from './effects/other/perish-body-effect';

describe('AbilityRegistry（ほろびのボディ）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('ほろびのボディ が登録されている', () => {
    expect(AbilityRegistry.get('ほろびのボディ')).toBeInstanceOf(PerishBodyEffect);
  });
});
