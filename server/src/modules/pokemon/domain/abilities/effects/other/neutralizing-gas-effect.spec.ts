import { NeutralizingGasEffect } from './neutralizing-gas-effect';
import { AbilityRegistry } from '../../ability-registry';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { resolveAbilityName } from '../../../battle-events/ability-lookup';

describe('NeutralizingGasEffect（かがくへんかガス）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('かがくへんかガス として登録されている', () => {
    // Arrange & Act
    const effect = AbilityRegistry.get('かがくへんかガス');

    // Assert
    expect(effect).toBeInstanceOf(NeutralizingGasEffect);
  });

  it('場にいる間、相手の特性は効かない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'かがくへんかガス' },
      { ability: 'いかく' },
    );

    // Act
    const opponentAbility = await resolveAbilityName(get(2), context());
    const ownAbility = await resolveAbilityName(get(1), context());

    // Assert
    expect(opponentAbility).toBeUndefined();
    expect(ownAbility).toBe('かがくへんかガス');
  });

  it('相手の消せない特性（バトルスイッチ）は効いたまま', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'かがくへんかガス' },
      { ability: 'バトルスイッチ' },
    );

    // Act
    const opponentAbility = await resolveAbilityName(get(2), context());

    // Assert
    expect(opponentAbility).toBe('バトルスイッチ');
  });
});
