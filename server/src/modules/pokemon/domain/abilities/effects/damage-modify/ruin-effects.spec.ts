import { VesselOfRuinEffect } from './vessel-of-ruin-effect';
import { SwordOfRuinEffect } from './sword-of-ruin-effect';
import { TabletsOfRuinEffect } from './tablets-of-ruin-effect';
import { BeadsOfRuinEffect } from './beads-of-ruin-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('わざわい系特性', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (cat?: 'Physical' | 'Special' | 'Status'): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveCategory: cat,
  });

  describe('VesselOfRuinEffect（わざわいのうつわ）', () => {
    const effect = new VesselOfRuinEffect();

    it('特殊技で受けるダメージを 0.75 倍にする', () => {
      expect(effect.modifyDamage(pokemon, 100, createCtx('Special'))).toBe(75);
    });

    it('物理技で受けるダメージは変えない', () => {
      expect(effect.modifyDamage(pokemon, 100, createCtx('Physical'))).toBe(100);
    });

    it('与えるダメージは変えない', () => {
      expect(effect.modifyDamageDealt(pokemon, 100, createCtx('Special'))).toBeUndefined();
    });
  });

  describe('TabletsOfRuinEffect（わざわいのおふだ）', () => {
    const effect = new TabletsOfRuinEffect();

    it('物理技で受けるダメージを 0.75 倍にする', () => {
      expect(effect.modifyDamage(pokemon, 100, createCtx('Physical'))).toBe(75);
    });

    it('特殊技で受けるダメージは変えない', () => {
      expect(effect.modifyDamage(pokemon, 100, createCtx('Special'))).toBe(100);
    });

    it('与えるダメージは変えない', () => {
      expect(effect.modifyDamageDealt(pokemon, 100, createCtx('Physical'))).toBeUndefined();
    });
  });

  describe('SwordOfRuinEffect（わざわいのつるぎ）', () => {
    const effect = new SwordOfRuinEffect();

    it('物理技で与えるダメージを 1/0.75 倍にする', () => {
      expect(effect.modifyDamageDealt(pokemon, 75, createCtx('Physical'))).toBe(100);
    });

    it('特殊技で与えるダメージは変えない', () => {
      expect(effect.modifyDamageDealt(pokemon, 75, createCtx('Special'))).toBeUndefined();
    });

    it('受けるダメージは変えない', () => {
      expect(effect.modifyDamage(pokemon, 100, createCtx('Physical'))).toBe(100);
    });
  });

  describe('BeadsOfRuinEffect（わざわいのたま）', () => {
    const effect = new BeadsOfRuinEffect();

    it('特殊技で与えるダメージを 1/0.75 倍にする', () => {
      expect(effect.modifyDamageDealt(pokemon, 75, createCtx('Special'))).toBe(100);
    });

    it('物理技で与えるダメージは変えない', () => {
      expect(effect.modifyDamageDealt(pokemon, 75, createCtx('Physical'))).toBeUndefined();
    });

    it('受けるダメージは変えない', () => {
      expect(effect.modifyDamage(pokemon, 100, createCtx('Special'))).toBe(100);
    });
  });
});
