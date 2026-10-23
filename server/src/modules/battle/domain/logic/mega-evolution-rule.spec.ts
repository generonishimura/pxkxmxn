import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { PersistentPokemonState } from '../state/persistent-state';
import { SideConditions } from '../state/side-state';
import { isMegaForm, resolveMegaEvolution } from './mega-evolution-rule';

describe('mega-evolution-rule', () => {
  /** リザードン（全国図鑑 6）・スピアー（15） */
  const CHARIZARD = 6;
  const BEEDRILL = 15;

  const status = (persistentState: PersistentPokemonState): BattlePokemonStatus =>
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
      0,
      0,
      null,
      {},
      persistentState,
    );

  describe('resolveMegaEvolution', () => {
    it('自分のメガストーンを持ち、トレーナーがまだメガシンカしていなければ、メガシンカした姿を返す', () => {
      // Arrange
      const holder = status({ item: 'リザードナイトＹ' });
      const side: SideConditions = {};

      // Act
      const result = resolveMegaEvolution(CHARIZARD, holder, side);

      // Assert
      expect(result).toEqual({ mega: expect.objectContaining({ form: 'mega-y' }) });
    });

    it('持ち物がなければ noMegaStone を返す', () => {
      // Arrange
      const holder = status({});

      // Act
      const result = resolveMegaEvolution(CHARIZARD, holder, {});

      // Assert
      expect(result).toEqual({ problem: 'noMegaStone' });
    });

    it('ほかの種族のメガストーンなら noMegaStone を返す', () => {
      // Arrange
      const holder = status({ item: 'リザードナイトＸ' });

      // Act
      const result = resolveMegaEvolution(BEEDRILL, holder, {});

      // Assert
      expect(result).toEqual({ problem: 'noMegaStone' });
    });

    it('メガストーンでない持ち物なら noMegaStone を返す', () => {
      // Arrange
      const holder = status({ item: 'たべのこし' });

      // Act
      const result = resolveMegaEvolution(CHARIZARD, holder, {});

      // Assert
      expect(result).toEqual({ problem: 'noMegaStone' });
    });

    it('トレーナーがこのバトルですでにメガシンカしていれば alreadyUsed を返す', () => {
      // Arrange
      const holder = status({ item: 'リザードナイトＹ' });

      // Act
      const result = resolveMegaEvolution(CHARIZARD, holder, { megaEvolved: true });

      // Assert
      expect(result).toEqual({ problem: 'alreadyUsed' });
    });

    it('すでにメガシンカした姿なら alreadyMegaEvolved を返す', () => {
      // Arrange
      const holder = status({ item: 'リザードナイトＹ', form: 'mega-y' });

      // Act
      const result = resolveMegaEvolution(CHARIZARD, holder, { megaEvolved: true });

      // Assert
      expect(result).toEqual({ problem: 'alreadyMegaEvolved' });
    });
  });

  describe('isMegaForm', () => {
    it('その種族のメガシンカした姿なら true を返す', () => {
      // Act & Assert
      expect(isMegaForm(CHARIZARD, 'mega-x')).toBe(true);
    });

    it('フォルムがない・メガシンカでないフォルムなら false を返す', () => {
      // Act & Assert
      expect(isMegaForm(CHARIZARD, undefined)).toBe(false);
      expect(isMegaForm(681, 'blade')).toBe(false);
    });
  });
});
