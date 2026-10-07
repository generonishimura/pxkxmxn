import { createInMemoryBattle } from './__tests__/in-memory-battle';
import {
  hasType,
  resolveBattleAbilityName,
  resolveBattlePokemonTraits,
  resolveTypeNames,
} from './battle-traits';
import { resolveAbilityName } from './ability-lookup';

describe('battle-traits', () => {
  describe('resolveBattleAbilityName', () => {
    it('場の相手のかがくへんかガスを、リポジトリから引いて判定する', async () => {
      // Arrange
      const battle = createInMemoryBattle({ ability: 'いかく' }, { ability: 'かがくへんかガス' });

      // Act
      const name = await resolveBattleAbilityName(battle.get(1), battle.context());

      // Assert
      expect(name).toBeUndefined();
    });

    it('相手が控えにいれば、かがくへんかガスで消えない', async () => {
      // Arrange
      const battle = createInMemoryBattle(
        { ability: 'いかく' },
        { ability: 'かがくへんかガス', status: { isActive: false } },
      );

      // Act
      const name = await resolveBattleAbilityName(battle.get(1), battle.context());

      // Assert
      expect(name).toBe('いかく');
    });

    it('消せない特性のときは、場のポケモンを引かない', async () => {
      // Arrange
      const battle = createInMemoryBattle(
        { ability: 'バトルスイッチ' },
        { ability: 'かがくへんかガス' },
      );

      // Act
      const name = await resolveBattleAbilityName(battle.get(1), battle.context());

      // Assert
      expect(name).toBe('バトルスイッチ');
      expect(battle.battleRepository.findBattlePokemonStatusByBattleId).not.toHaveBeenCalled();
    });
  });

  describe('resolveAbilityName', () => {
    it('コンテキストの相手の特性がかがくへんかガスなら、リポジトリを引かずに消す', async () => {
      // Arrange
      const battle = createInMemoryBattle({ ability: 'いかく' }, { ability: 'かがくへんかガス' });
      const ctx = battle.context({
        attacker: battle.get(2),
        attackerAbilityName: 'かがくへんかガス',
      });

      // Act
      const name = await resolveAbilityName(battle.get(1), ctx);

      // Assert
      expect(name).toBeUndefined();
      expect(battle.battleRepository.findBattlePokemonStatusByBattleId).not.toHaveBeenCalled();
    });

    it('abilityOverride の特性を返す', async () => {
      // Arrange
      const battle = createInMemoryBattle({
        ability: 'いかく',
        status: { volatileState: { abilityOverride: 'たんじゅん' } },
      });

      // Act
      const name = await resolveAbilityName(battle.get(1), battle.context());

      // Assert
      expect(name).toBe('たんじゅん');
    });
  });

  describe('resolveTypeNames / hasType', () => {
    it('typeOverride と addedType を反映したタイプを返す', async () => {
      // Arrange
      const battle = createInMemoryBattle({
        types: ['ほのお'],
        status: { volatileState: { typeOverride: ['みず'], addedType: 'くさ' } },
      });

      // Act
      const types = await resolveTypeNames(battle.get(1), battle.context());
      const grass = await hasType(battle.get(1), 'くさ', battle.context());
      const fire = await hasType(battle.get(1), 'ほのお', battle.context());

      // Assert
      expect(types).toEqual(['みず', 'くさ']);
      expect(grass).toBe(true);
      expect(fire).toBe(false);
    });
  });

  describe('resolveBattlePokemonTraits', () => {
    it('statOverrides を反映した実数値を返す', async () => {
      // Arrange
      const battle = createInMemoryBattle({
        status: { volatileState: { statOverrides: { attack: 999 } } },
      });

      // Act
      const traits = await resolveBattlePokemonTraits(battle.get(1), battle.context());

      // Assert
      expect(traits?.stats.attack).toBe(999);
      expect(traits?.stats.defense).toBe(120);
    });
  });
});
