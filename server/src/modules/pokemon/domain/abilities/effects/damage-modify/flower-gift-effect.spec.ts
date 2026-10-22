import { FlowerGiftEffect } from './flower-gift-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus, Weather } from '@/modules/battle/domain/entities/battle.entity';

describe('FlowerGiftEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (
    weather: Weather | null,
    cat?: 'Physical' | 'Special' | 'Status',
  ): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, weather, null, BattleStatus.Active, null),
    weather,
    moveCategory: cat,
  });

  let effect: FlowerGiftEffect;

  beforeEach(() => {
    effect = new FlowerGiftEffect();
  });

  describe('与えるダメージ（こうげき 1.5 倍）', () => {
    it('晴れのとき物理技のダメージを 1.5 倍にする', () => {
      expect(effect.modifyDamageDealt(pokemon, 100, createCtx(Weather.Sun, 'Physical'))).toBe(150);
    });

    it('晴れでも特殊技のダメージは変えない', () => {
      expect(
        effect.modifyDamageDealt(pokemon, 100, createCtx(Weather.Sun, 'Special')),
      ).toBeUndefined();
    });

    it('晴れ以外では物理技のダメージを変えない', () => {
      expect(
        effect.modifyDamageDealt(pokemon, 100, createCtx(Weather.Rain, 'Physical')),
      ).toBeUndefined();
    });

    it('battleContext が無い場合はダメージを変えない', () => {
      expect(effect.modifyDamageDealt(pokemon, 100, undefined)).toBeUndefined();
    });
  });

  describe('受けるダメージ（とくぼう 1.5 倍）', () => {
    it('晴れのとき特殊技で受けるダメージを 1/1.5 倍にする', () => {
      expect(effect.modifyDamage(pokemon, 150, createCtx(Weather.Sun, 'Special'))).toBe(100);
    });

    it('晴れでも物理技で受けるダメージは変えない', () => {
      expect(effect.modifyDamage(pokemon, 150, createCtx(Weather.Sun, 'Physical'))).toBe(150);
    });

    it('晴れ以外では特殊技で受けるダメージを変えない', () => {
      expect(effect.modifyDamage(pokemon, 150, createCtx(null, 'Special'))).toBe(150);
    });

    it('battleContext.weather が無いときは battle.weather を使う', () => {
      // Arrange
      const ctx: BattleContext = {
        battle: new Battle(1, 1, 2, 1, 2, 1, Weather.Sun, null, BattleStatus.Active, null),
        moveCategory: 'Special',
      };

      // Act
      const result = effect.modifyDamage(pokemon, 150, ctx);

      // Assert
      expect(result).toBe(100);
    });

    it('battleContext が無い場合はダメージを変えない', () => {
      expect(effect.modifyDamage(pokemon, 150, undefined)).toBe(150);
    });
  });
});
