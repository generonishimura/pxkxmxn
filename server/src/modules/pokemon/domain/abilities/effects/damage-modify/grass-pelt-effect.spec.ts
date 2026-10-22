import { GrassPeltEffect } from './grass-pelt-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus, Field } from '@/modules/battle/domain/entities/battle.entity';

describe('GrassPeltEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (
    battleField: Field | null,
    cat?: 'Physical' | 'Special' | 'Status',
    contextField?: Field | null,
  ): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, battleField, BattleStatus.Active, null),
    field: contextField,
    moveCategory: cat,
  });

  let effect: GrassPeltEffect;

  beforeEach(() => {
    effect = new GrassPeltEffect();
  });

  it('グラスフィールドのとき物理技のダメージを 1/1.5 倍にする', () => {
    expect(effect.modifyDamage(pokemon, 150, createCtx(Field.GrassyTerrain, 'Physical'))).toBe(100);
  });

  it('battleContext.field がグラスフィールドなら battle.field より優先して軽減する', () => {
    expect(
      effect.modifyDamage(pokemon, 150, createCtx(null, 'Physical', Field.GrassyTerrain)),
    ).toBe(100);
  });

  it('グラスフィールドでも特殊技のダメージは軽減しない', () => {
    expect(effect.modifyDamage(pokemon, 150, createCtx(Field.GrassyTerrain, 'Special'))).toBe(150);
  });

  it('グラスフィールド以外では物理技のダメージを軽減しない', () => {
    expect(effect.modifyDamage(pokemon, 150, createCtx(Field.ElectricTerrain, 'Physical'))).toBe(
      150,
    );
  });

  it('フィールドが無い場合は軽減しない', () => {
    expect(effect.modifyDamage(pokemon, 150, createCtx(null, 'Physical'))).toBe(150);
  });

  it('battleContext が無い場合は軽減しない', () => {
    expect(effect.modifyDamage(pokemon, 150, undefined)).toBe(150);
  });

  it('小数になる値は Math.floor で切り捨て', () => {
    expect(effect.modifyDamage(pokemon, 100, createCtx(Field.GrassyTerrain, 'Physical'))).toBe(66);
  });
});
