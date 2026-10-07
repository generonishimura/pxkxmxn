import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { emptyVolatileState } from '@/modules/battle/domain/state/volatile-state';
import { TrapTarget } from '../../../battle-events/switching';
import { ShadowTagEffect } from './shadow-tag-effect';
import { ArenaTrapEffect } from './arena-trap-effect';
import { MagnetPullEffect } from './magnet-pull-effect';

const createPokemon = (id: number, abilitySuppressed = false): BattlePokemonStatus =>
  new BattlePokemonStatus(
    id,
    1,
    id,
    id,
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
    abilitySuppressed ? { ...emptyVolatileState(), abilitySuppressed: true } : emptyVolatileState(),
  );

const createTarget = (overrides: Partial<TrapTarget> = {}): TrapTarget => ({
  pokemon: createPokemon(2),
  typeNames: ['ノーマル'],
  abilityName: 'にげあし',
  grounded: true,
  ...overrides,
});

describe('逃げられなくする特性', () => {
  const holder = createPokemon(1);

  describe('ShadowTagEffect（かげふみ）', () => {
    const effect = new ShadowTagEffect();

    it('かげふみでない相手は逃げられない', () => {
      // Arrange
      const target = createTarget();

      // Act
      const result = effect.trapsOpponent(holder, target);

      // Assert
      expect(result).toBe(true);
    });

    it('地面にいない相手も逃げられない', () => {
      // Arrange
      const target = createTarget({ typeNames: ['ひこう'], grounded: false });

      // Act
      const result = effect.trapsOpponent(holder, target);

      // Assert
      expect(result).toBe(true);
    });

    it('相手もかげふみなら逃げられる', () => {
      // Arrange
      const target = createTarget({ abilityName: 'かげふみ' });

      // Act
      const result = effect.trapsOpponent(holder, target);

      // Assert
      expect(result).toBe(false);
    });

    it('相手のかげふみが消されている（いえき）なら逃げられない', () => {
      // Arrange
      const target = createTarget({ pokemon: createPokemon(2, true), abilityName: 'かげふみ' });

      // Act
      const result = effect.trapsOpponent(holder, target);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('ArenaTrapEffect（ありじごく）', () => {
    const effect = new ArenaTrapEffect();

    it('地面にいる相手は逃げられない', () => {
      // Arrange
      const target = createTarget({ grounded: true });

      // Act
      const result = effect.trapsOpponent(holder, target);

      // Assert
      expect(result).toBe(true);
    });

    it('地面にいない相手（ひこうタイプ・ふゆうなど）は逃げられる', () => {
      // Arrange
      const target = createTarget({ typeNames: ['ひこう'], grounded: false });

      // Act
      const result = effect.trapsOpponent(holder, target);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('MagnetPullEffect（じりょく）', () => {
    const effect = new MagnetPullEffect();

    it('はがねタイプの相手は逃げられない', () => {
      // Arrange
      const target = createTarget({ typeNames: ['いわ', 'はがね'] });

      // Act
      const result = effect.trapsOpponent(holder, target);

      // Assert
      expect(result).toBe(true);
    });

    it('はがねタイプでない相手は逃げられる', () => {
      // Arrange
      const target = createTarget({ typeNames: ['でんき'] });

      // Act
      const result = effect.trapsOpponent(holder, target);

      // Assert
      expect(result).toBe(false);
    });
  });
});
