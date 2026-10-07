import { AccuracyCalculator } from './accuracy-calculator';
import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '../entities/battle.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { IAbilityEffect } from '@/modules/pokemon/domain/abilities/ability-effect.interface';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';

/**
 * 命中率の前の補正（modifyBaseAccuracy）と、必ず当たる特性（ensuresMoveHit）
 */
describe('AccuracyCalculator - 命中率の前の補正と必中', () => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);

  const createStatus = (id: number, evasionRank = 0): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, evasionRank, null);

  const statusMoveContext: BattleContext = { battle, moveCategory: 'Status', moveName: 'でんじは' };

  /** ミラクルスキン相当: 変化技なら命中率を 50 にする */
  const wonderSkin: IAbilityEffect = {
    modifyBaseAccuracy: (_h, role, _accuracy, ctx) =>
      role === 'defender' && ctx?.moveCategory === 'Status' ? 50 : undefined,
  };

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    AbilityRegistry.register('テストのミラクルスキン', wonderSkin);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('防御側特性の modifyBaseAccuracy で、ランク補正の前の命中率を変える', () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.6);

    // Act
    const hit = AccuracyCalculator.checkHit(
      90,
      createStatus(1),
      createStatus(2),
      undefined,
      'テストのミラクルスキン',
      statusMoveContext,
    );

    // Assert
    expect(hit).toBe(false);
  });

  it('modifyBaseAccuracy のあとに回避ランクが掛かる（回避 -1 で 50 → 66.7）', () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.6);

    // Act
    const hit = AccuracyCalculator.checkHit(
      90,
      createStatus(1),
      createStatus(2, -1),
      undefined,
      'テストのミラクルスキン',
      statusMoveContext,
    );

    // Assert
    expect(hit).toBe(true);
  });

  it('防御側特性の modifyBaseAccuracy は、かたやぶりで無視される', () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.6);

    // Act
    const hit = AccuracyCalculator.checkHit(
      90,
      createStatus(1),
      createStatus(2),
      'かたやぶり',
      'テストのミラクルスキン',
      statusMoveContext,
    );

    // Assert
    expect(hit).toBe(true);
  });

  it('攻撃側特性の modifyBaseAccuracy には role = attacker が渡る', () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.6);
    const roles: string[] = [];
    AbilityRegistry.register('テストのめいちゅう', {
      modifyBaseAccuracy: (_h, role) => {
        roles.push(role);
        return 50;
      },
    });

    // Act
    const hit = AccuracyCalculator.checkHit(
      90,
      createStatus(1),
      createStatus(2),
      'テストのめいちゅう',
      undefined,
      statusMoveContext,
    );

    // Assert
    expect(hit).toBe(false);
    expect(roles).toEqual(['attacker']);
  });

  it.each([
    ['攻撃側', 'テストのノーガード', undefined],
    ['防御側', undefined, 'テストのノーガード'],
  ])('%s特性の ensuresMoveHit があれば必ず当たる', (_label, attackerAbility, defenderAbility) => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    AbilityRegistry.register('テストのノーガード', { ensuresMoveHit: true });

    // Act
    const hit = AccuracyCalculator.checkHit(
      30,
      createStatus(1),
      createStatus(2, 6),
      attackerAbility,
      defenderAbility,
      statusMoveContext,
    );

    // Assert
    expect(hit).toBe(true);
  });

  it('ensuresMoveHit は、かたやぶりでも無視されない', () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    AbilityRegistry.register('テストのノーガード', { ensuresMoveHit: true });

    // Act
    const hit = AccuracyCalculator.checkHit(
      30,
      createStatus(1),
      createStatus(2),
      'かたやぶり',
      'テストのノーガード',
      statusMoveContext,
    );

    // Assert
    expect(hit).toBe(true);
  });

  it('options.ensuresHit なら必ず当たる（どくタイプが使うどくどく）', () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.99);

    // Act
    const hit = AccuracyCalculator.checkHit(
      90,
      createStatus(1),
      createStatus(2),
      undefined,
      undefined,
      statusMoveContext,
      { ensuresHit: true },
    );

    // Assert
    expect(hit).toBe(true);
  });
});
