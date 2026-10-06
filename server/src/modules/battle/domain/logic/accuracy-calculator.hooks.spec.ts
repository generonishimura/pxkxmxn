import { AccuracyCalculator } from './accuracy-calculator';
import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '../entities/battle.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';

describe('AccuracyCalculator - ランク無視', () => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);

  const createStatus = (accuracyRank: number, evasionRank: number): BattlePokemonStatus =>
    new BattlePokemonStatus(
      1,
      1,
      1,
      1,
      true,
      100,
      100,
      0,
      0,
      0,
      0,
      0,
      accuracyRank,
      evasionRank,
      null,
    );

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('ignoredDefenderRanks に evasion があると、防御側の回避ランクを無視して命中する', () => {
    // Arrange
    const attacker = createStatus(0, 0);
    const defender = createStatus(0, 6);

    // Act
    const hit = AccuracyCalculator.checkHit(100, attacker, defender, undefined, undefined, {
      battle,
      ignoredDefenderRanks: new Set(['evasion']),
    });

    // Assert
    expect(hit).toBe(true);
  });

  it('ignoredAttackerRanks に accuracy があると、攻撃側の命中ランクを無視して命中する', () => {
    // Arrange
    const attacker = createStatus(-6, 0);
    const defender = createStatus(0, 0);

    // Act
    const hit = AccuracyCalculator.checkHit(100, attacker, defender, undefined, undefined, {
      battle,
      ignoredAttackerRanks: new Set(['accuracy']),
    });

    // Assert
    expect(hit).toBe(true);
  });

  it('ランク無視がない場合は回避ランクで外れる', () => {
    // Arrange
    const attacker = createStatus(0, 0);
    const defender = createStatus(0, 6);

    // Act
    const hit = AccuracyCalculator.checkHit(100, attacker, defender, undefined, undefined, {
      battle,
    });

    // Assert
    expect(hit).toBe(false);
  });
});
