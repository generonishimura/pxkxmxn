import { QuarkDriveEffect } from './quark-drive-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext, BattleStatValues } from '../../battle-context.interface';
import {
  Battle,
  BattleStatus,
  Field,
  Weather,
} from '@/modules/battle/domain/entities/battle.entity';

describe('QuarkDriveEffect', () => {
  const holder = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createStats = (overrides?: Partial<BattleStatValues>): BattleStatValues => ({
    attack: 100,
    defense: 100,
    specialAttack: 100,
    specialDefense: 100,
    speed: 100,
    ...overrides,
  });

  const createBattle = (field: Field | null): Battle =>
    new Battle(1, 1, 2, 1, 2, 1, Weather.Sun, field, BattleStatus.Active, null);

  const createCtx = (overrides?: Partial<BattleContext>): BattleContext => ({
    battle: createBattle(null),
    field: Field.ElectricTerrain,
    moveCategory: 'Physical',
    ...overrides,
  });

  let effect: QuarkDriveEffect;

  beforeEach(() => {
    effect = new QuarkDriveEffect();
  });

  it('かたやぶりで無視されない', () => {
    // Assert
    expect(effect.unaffectedByMoldBreaker).toBe(true);
  });

  describe('modifyDamageDealt（攻撃側）', () => {
    it('エレキフィールドで攻撃が一番高いとき、物理技のダメージを 5325/4096 倍にする', () => {
      // Arrange
      const ctx = createCtx({ attackerStats: createStats({ attack: 150 }) });

      // Act
      const result = effect.modifyDamageDealt(holder, 100, ctx);

      // Assert
      expect(result).toBe(130);
    });

    it('context.field が無い場合は battle.field を参照する', () => {
      // Arrange
      const ctx = createCtx({
        battle: createBattle(Field.ElectricTerrain),
        field: undefined,
        moveCategory: 'Special',
        attackerStats: createStats({ specialAttack: 150 }),
      });

      // Act
      const result = effect.modifyDamageDealt(holder, 100, ctx);

      // Assert
      expect(result).toBe(130);
    });

    it('エレキフィールド以外ではダメージを変えない（はれでも発動しない）', () => {
      // Arrange
      const ctx = createCtx({
        field: Field.GrassyTerrain,
        weather: Weather.Sun,
        attackerStats: createStats({ attack: 150 }),
      });

      // Act
      const result = effect.modifyDamageDealt(holder, 100, ctx);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('modifyDamage（防御側）', () => {
    it('エレキフィールドで防御が一番高いとき、物理技で受けるダメージを 4096/5325 倍にする', () => {
      // Arrange
      const ctx = createCtx({ defenderStats: createStats({ defense: 150 }) });

      // Act
      const result = effect.modifyDamage(holder, 130, ctx);

      // Assert
      expect(result).toBe(100);
    });

    it('エレキフィールド以外では受けるダメージを変えない', () => {
      // Arrange
      const ctx = createCtx({ field: Field.None, defenderStats: createStats({ defense: 150 }) });

      // Act
      const result = effect.modifyDamage(holder, 130, ctx);

      // Assert
      expect(result).toBe(130);
    });
  });

  describe('modifySpeed', () => {
    it('エレキフィールドで素早さが一番高いとき、素早さを 1.5 倍にする', () => {
      // Arrange
      const ctx = createCtx({ attackerStats: createStats({ speed: 150 }) });

      // Act
      const result = effect.modifySpeed(holder, 150, ctx);

      // Assert
      expect(result).toBe(225);
    });

    it('エレキフィールド以外では素早さを変えない', () => {
      // Arrange
      const ctx = createCtx({ field: null, attackerStats: createStats({ speed: 150 }) });

      // Act
      const result = effect.modifySpeed(holder, 150, ctx);

      // Assert
      expect(result).toBeUndefined();
    });
  });
});
