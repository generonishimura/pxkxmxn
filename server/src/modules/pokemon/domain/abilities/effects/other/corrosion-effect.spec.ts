import { CorrosionEffect } from './corrosion-effect';
import { AbilityRegistry } from '../../ability-registry';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { EffectSource } from '../../../battle-events/effect-source';
import { canInflictStatus } from '../../../battle-events/status-infliction';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('CorrosionEffect（ふしょく）', () => {
  const byToxic = (pokemon: EffectSource['pokemon']): EffectSource => ({
    pokemon,
    kind: 'move',
    name: 'どくどく',
  });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('bypassesStatusTypeImmunity', () => {
    it.each([StatusCondition.Poison, StatusCondition.BadPoison])(
      '%s のタイプによる免疫を無視する',
      status => {
        // Arrange
        const { get } = createInMemoryBattle({ ability: 'ふしょく' });

        // Act
        const result = new CorrosionEffect().bypassesStatusTypeImmunity(get(1), status);

        // Assert
        expect(result).toBe(true);
      },
    );

    it.each([StatusCondition.Burn, StatusCondition.Paralysis, StatusCondition.Freeze])(
      '%s のタイプによる免疫は無視しない',
      status => {
        // Arrange
        const { get } = createInMemoryBattle({ ability: 'ふしょく' });

        // Act
        const result = new CorrosionEffect().bypassesStatusTypeImmunity(get(1), status);

        // Assert
        expect(result).toBe(false);
      },
    );
  });

  describe('状態異常の付与（canInflictStatus）', () => {
    it.each([['はがね'], ['どく']])(
      '付与元がふしょくなら、%sタイプの相手をもうどくにできる',
      async type => {
        // Arrange
        const { context, get } = createInMemoryBattle({ ability: 'ふしょく' }, { types: [type] });

        // Act
        const result = await canInflictStatus(get(2), StatusCondition.BadPoison, context(), {
          source: byToxic(get(1)),
        });

        // Assert
        expect(result).toBe(true);
      },
    );

    it('付与元がふしょくでも、相手の特性（めんえき）で防がれる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'ふしょく' },
        { ability: 'めんえき', types: ['はがね'] },
      );

      // Act
      const result = await canInflictStatus(get(2), StatusCondition.Poison, context(), {
        source: byToxic(get(1)),
      });

      // Assert
      expect(result).toBe(false);
    });

    it('付与元がふしょくでも、ほのおタイプの相手はやけどにできない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ ability: 'ふしょく' }, { types: ['ほのお'] });

      // Act
      const result = await canInflictStatus(get(2), StatusCondition.Burn, context(), {
        source: { pokemon: get(1), kind: 'move', name: 'おにび' },
      });

      // Assert
      expect(result).toBe(false);
    });
  });

  it('AbilityRegistryに「ふしょく」として登録されている', () => {
    // Arrange
    // （beforeEach でレジストリを初期化済み）

    // Act
    const effect = AbilityRegistry.get('ふしょく');

    // Assert
    expect(effect).toBeInstanceOf(CorrosionEffect);
  });
});
