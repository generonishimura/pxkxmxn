import { UnawareEffect } from './unaware-effect';
import { createBattlePokemonStatus } from '../../../moves/effects/__tests__/test-helpers';

describe('UnawareEffect', () => {
  const pokemon = createBattlePokemonStatus();

  it('攻撃するときは、相手の防御・特防・回避のランクを無視する', () => {
    // Arrange
    const effect = new UnawareEffect();

    // Act
    const ignored = effect.ignoreOpponentRanks(pokemon, 'attacker');

    // Assert
    expect([...ignored].sort()).toEqual(['defense', 'evasion', 'specialDefense']);
  });

  it('攻撃を受けるときは、相手の攻撃・防御・特攻・命中のランクを無視する', () => {
    // Arrange
    const effect = new UnawareEffect();

    // Act
    const ignored = effect.ignoreOpponentRanks(pokemon, 'defender');

    // Assert
    expect([...ignored].sort()).toEqual(['accuracy', 'attack', 'defense', 'specialAttack']);
  });
});
