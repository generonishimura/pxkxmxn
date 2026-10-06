import { ProtosynthesisEffect } from './protosynthesis-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext, BattleStatValues } from '../../battle-context.interface';
import { Battle, BattleStatus, Weather } from '@/modules/battle/domain/entities/battle.entity';

describe('ProtosynthesisEffect', () => {
  const createStatus = (speedRank = 0): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, speedRank, 0, 0, null);
  const holder = createStatus();

  const createStats = (overrides?: Partial<BattleStatValues>): BattleStatValues => ({
    attack: 100,
    defense: 100,
    specialAttack: 100,
    specialDefense: 100,
    speed: 100,
    ...overrides,
  });

  const createCtx = (overrides?: Partial<BattleContext>): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, Weather.None, null, BattleStatus.Active, null),
    weather: Weather.Sun,
    moveCategory: 'Physical',
    ...overrides,
  });

  let effect: ProtosynthesisEffect;

  beforeEach(() => {
    effect = new ProtosynthesisEffect();
  });

  it('かたやぶりで無視されない', () => {
    // Assert
    expect(effect.unaffectedByMoldBreaker).toBe(true);
  });

  describe('modifyDamageDealt（攻撃側）', () => {
    it('はれで攻撃が一番高いとき、物理技のダメージを 5325/4096 倍にする', () => {
      // Arrange
      const ctx = createCtx({ attackerStats: createStats({ attack: 150 }) });

      // Act
      const result = effect.modifyDamageDealt(holder, 100, ctx);

      // Assert
      expect(result).toBe(130);
    });

    it('はれで特攻が一番高いとき、特殊技のダメージを 5325/4096 倍にする', () => {
      // Arrange
      const ctx = createCtx({
        moveCategory: 'Special',
        attackerStats: createStats({ specialAttack: 150 }),
      });

      // Act
      const result = effect.modifyDamageDealt(holder, 200, ctx);

      // Assert
      // floor((200 × 5325 + 2047) / 4096) = 260
      expect(result).toBe(260);
    });

    it('攻撃が一番高くても、特殊技のダメージは変えない', () => {
      // Arrange
      const ctx = createCtx({
        moveCategory: 'Special',
        attackerStats: createStats({ attack: 150 }),
      });

      // Act
      const result = effect.modifyDamageDealt(holder, 100, ctx);

      // Assert
      expect(result).toBeUndefined();
    });

    it('はれでないときはダメージを変えない', () => {
      // Arrange
      const ctx = createCtx({ weather: Weather.Rain, attackerStats: createStats({ attack: 150 }) });

      // Act
      const result = effect.modifyDamageDealt(holder, 100, ctx);

      // Assert
      expect(result).toBeUndefined();
    });

    it('効果のある天候が None なら（ノーてんきなど）、場がはれでもダメージを変えない', () => {
      // Arrange
      const ctx = createCtx({
        battle: new Battle(1, 1, 2, 1, 2, 1, Weather.Sun, null, BattleStatus.Active, null),
        weather: Weather.None,
        attackerStats: createStats({ attack: 150 }),
      });

      // Act
      const result = effect.modifyDamageDealt(holder, 100, ctx);

      // Assert
      expect(result).toBeUndefined();
    });

    it('実数値がない場合はダメージを変えない', () => {
      // Act
      const result = effect.modifyDamageDealt(holder, 100, createCtx());

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('modifyDamage（防御側）', () => {
    it('はれで防御が一番高いとき、物理技で受けるダメージを 4096/5325 倍にする', () => {
      // Arrange
      const ctx = createCtx({ defenderStats: createStats({ defense: 150 }) });

      // Act
      const result = effect.modifyDamage(holder, 130, ctx);

      // Assert
      // floor((130 × 3150 + 2047) / 4096) = 100（floor(4096 × 4096 / 5325) = 3150）
      expect(result).toBe(100);
    });

    it('はれで特防が一番高いとき、特殊技で受けるダメージを 4096/5325 倍にする', () => {
      // Arrange
      const ctx = createCtx({
        moveCategory: 'Special',
        defenderStats: createStats({ specialDefense: 150 }),
      });

      // Act
      const result = effect.modifyDamage(holder, 130, ctx);

      // Assert
      expect(result).toBe(100);
    });

    it('防御が一番高くても、特殊技で受けるダメージは変えない', () => {
      // Arrange
      const ctx = createCtx({
        moveCategory: 'Special',
        defenderStats: createStats({ defense: 150 }),
      });

      // Act
      const result = effect.modifyDamage(holder, 130, ctx);

      // Assert
      expect(result).toBe(130);
    });

    it('はれでないときは受けるダメージを変えない', () => {
      // Arrange
      const ctx = createCtx({ weather: null, defenderStats: createStats({ defense: 150 }) });

      // Act
      const result = effect.modifyDamage(holder, 130, ctx);

      // Assert
      expect(result).toBe(130);
    });
  });

  describe('modifySpeed', () => {
    it('はれで素早さが一番高いとき、素早さを 1.5 倍にする', () => {
      // Arrange
      const ctx = createCtx({ attackerStats: createStats({ speed: 150 }) });

      // Act
      const result = effect.modifySpeed(holder, 150, ctx);

      // Assert
      expect(result).toBe(225);
    });

    it('ランク補正込みで一番高い能力を選ぶ', () => {
      // Arrange
      const ctx = createCtx({ attackerStats: createStats({ attack: 120 }) });

      // Act
      const result = effect.modifySpeed(createStatus(1), 150, ctx);

      // Assert
      // 素早さ 100 × 1.5（ランク+1）= 150 > 攻撃 120
      expect(result).toBe(225);
    });

    it('素早さ以外が一番高いときは素早さを変えない', () => {
      // Arrange
      const ctx = createCtx({ attackerStats: createStats({ attack: 150 }) });

      // Act
      const result = effect.modifySpeed(holder, 100, ctx);

      // Assert
      expect(result).toBeUndefined();
    });

    it('はれでないときは素早さを変えない', () => {
      // Arrange
      const ctx = createCtx({
        weather: Weather.Sandstorm,
        attackerStats: createStats({ speed: 150 }),
      });

      // Act
      const result = effect.modifySpeed(holder, 150, ctx);

      // Assert
      expect(result).toBeUndefined();
    });
  });
});
