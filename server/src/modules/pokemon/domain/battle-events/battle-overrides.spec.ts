import { AbilityRegistry } from '../abilities/ability-registry';
import { createInMemoryBattle } from './__tests__/in-memory-battle';
import { addType, findResistingTypeNames, setTypes } from './type-change';
import { setAbility, suppressAbility, swapAbilities } from './ability-change';
import { findIllusionTarget } from './illusion';
import { resolveTypeNames } from './battle-traits';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { ITypeEffectivenessRepository } from '../pokemon.repository.interface';
import { Type } from '../entities/type.entity';

describe('タイプ・特性を書き換える補助関数', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('setTypes', () => {
    it('typeOverride を書き、addedType を消す（本家の setType）', async () => {
      // Arrange
      const battle = createInMemoryBattle({ status: { volatileState: { addedType: 'ゴースト' } } });

      // Act
      const changed = await setTypes(battle.get(1), ['みず'], battle.context());

      // Assert
      expect(changed).toBe(true);
      expect(battle.get(1).volatileState).toEqual({ typeOverride: ['みず'] });
    });

    it('ひんしのポケモンのタイプは変えられない', async () => {
      // Arrange
      const battle = createInMemoryBattle({ status: { currentHp: 0 } });

      // Act
      const changed = await setTypes(battle.get(1), ['みず'], battle.context());

      // Assert
      expect(changed).toBe(false);
      expect(battle.get(1).volatileState.typeOverride).toBeUndefined();
    });

    it('アルセウス・シルヴァディのタイプは変えられない', async () => {
      // Arrange
      const battle = createInMemoryBattle({ nationalDex: 493 }, { nationalDex: 773 });

      // Act
      const arceus = await setTypes(battle.get(1), ['みず'], battle.context());
      const silvally = await setTypes(battle.get(2), ['みず'], battle.context());

      // Assert
      expect(arceus).toBe(false);
      expect(silvally).toBe(false);
    });
  });

  describe('resolveTypeNames', () => {
    it('既定では 3 つめのタイプ（addedType）も含める', async () => {
      // Arrange
      const battle = createInMemoryBattle({
        types: ['くさ'],
        status: { volatileState: { addedType: 'ゴースト' } },
      });

      // Act
      const types = await resolveTypeNames(battle.get(1), battle.context());

      // Assert
      expect(types).toEqual(['くさ', 'ゴースト']);
    });

    it('excludeAddedType なら 3 つめのタイプを除く（ミラータイプ・もえつきるで写すタイプ。本家の getTypes(true)）', async () => {
      // Arrange
      const battle = createInMemoryBattle({
        types: ['くさ'],
        status: { volatileState: { addedType: 'ゴースト' } },
      });

      // Act
      const types = await resolveTypeNames(battle.get(1), battle.context(), {
        excludeAddedType: true,
      });

      // Assert
      expect(types).toEqual(['くさ']);
    });

    it('ignoreRoost なら、はねやすめで失ったひこうタイプも含める', async () => {
      // Arrange
      const battle = createInMemoryBattle({
        types: ['ひこう'],
        status: { volatileState: { roosting: true } },
      });

      // Act
      const types = await resolveTypeNames(battle.get(1), battle.context(), { ignoreRoost: true });

      // Assert
      expect(types).toEqual(['ひこう']);
    });
  });

  describe('addType', () => {
    it('addedType を書く（前に足したタイプは置き換える）', async () => {
      // Arrange
      const battle = createInMemoryBattle({ status: { volatileState: { addedType: 'くさ' } } });

      // Act
      const changed = await addType(battle.get(1), 'ゴースト', battle.context());

      // Assert
      expect(changed).toBe(true);
      expect(battle.get(1).volatileState.addedType).toBe('ゴースト');
    });
  });

  describe('findResistingTypeNames', () => {
    it('技のタイプを半減以下にするタイプを返す（相性 0 を含む）', async () => {
      // Arrange
      const names = ['ノーマル', 'ほのお', 'みず', 'ゴースト'];
      const types = names.map((name, index) => new Type(index + 1, name, name));
      const repository: ITypeEffectivenessRepository = {
        getTypeEffectivenessMap: () =>
          Promise.resolve(
            new Map([
              ['1-4', 0],
              ['2-2', 0.5],
              ['2-3', 0.5],
            ]),
          ),
        findTypeByName: name => Promise.resolve(types.find(type => type.name === name) ?? null),
      };

      // Act
      const normal = await findResistingTypeNames('ノーマル', {
        typeEffectivenessRepository: repository,
      });
      const fire = await findResistingTypeNames('ほのお', {
        typeEffectivenessRepository: repository,
      });

      // Assert
      expect(normal).toEqual(['ゴースト']);
      expect(fire).toEqual(['ほのお', 'みず']);
    });
  });

  describe('setAbility', () => {
    it('場に出たときだけ動く特性（かわりもの・イリュージョン）を受け取っても、onEntry は呼ばない（本家の onSwitchIn）', async () => {
      // Arrange
      const onEntry = jest.fn();
      AbilityRegistry.register('かわりもの', { onEntry });
      AbilityRegistry.register('イリュージョン', { onEntry });
      const battle = createInMemoryBattle({ ability: 'ふみん' }, { ability: 'ふみん' });

      // Act
      const imposter = await setAbility(battle.get(1), 'かわりもの', battle.context());
      const illusion = await setAbility(battle.get(2), 'イリュージョン', battle.context());

      // Assert
      expect(imposter.changed).toBe(true);
      expect(illusion.changed).toBe(true);
      expect(onEntry).not.toHaveBeenCalled();
    });

    it('abilityOverride を書き、新しい特性の onEntry を呼ぶ', async () => {
      // Arrange
      const onEntry = jest.fn();
      AbilityRegistry.register('テストのいかく', { onEntry });
      const battle = createInMemoryBattle({ ability: 'ふみん' });

      // Act
      const result = await setAbility(battle.get(1), 'テストのいかく', battle.context());

      // Assert
      expect(result).toEqual({ changed: true, previousAbilityName: 'ふみん' });
      expect(battle.get(1).volatileState.abilityOverride).toBe('テストのいかく');
      expect(onEntry).toHaveBeenCalledTimes(1);
    });

    it('今の特性が消せない特性（バトルスイッチ）なら書き換えられない', async () => {
      // Arrange
      const battle = createInMemoryBattle({ ability: 'バトルスイッチ' });

      // Act
      const result = await setAbility(battle.get(1), 'たんじゅん', battle.context());

      // Assert
      expect(result.changed).toBe(false);
      expect(battle.get(1).volatileState.abilityOverride).toBeUndefined();
    });

    it('新しい特性が消せない特性なら書き換えられない', async () => {
      // Arrange
      const battle = createInMemoryBattle({ ability: 'いかく' });

      // Act
      const result = await setAbility(battle.get(1), 'ばけのかわ', battle.context());

      // Assert
      expect(result.changed).toBe(false);
    });

    it('イリュージョンを書き換えると、化けている状態も消える', async () => {
      // Arrange
      const battle = createInMemoryBattle({
        ability: 'イリュージョン',
        status: { volatileState: { illusionStatusId: 3 } },
      });

      // Act
      await setAbility(battle.get(1), 'ミイラ', battle.context());

      // Assert
      expect(battle.get(1).volatileState).toEqual({ abilityOverride: 'ミイラ' });
    });
  });

  describe('swapAbilities', () => {
    it('両方の今の特性を入れ替える', async () => {
      // Arrange
      const battle = createInMemoryBattle(
        { ability: 'いかく' },
        { ability: 'ふみん', status: { volatileState: { abilityOverride: 'たんじゅん' } } },
      );

      // Act
      const swapped = await swapAbilities(battle.get(1), battle.get(2), battle.context());

      // Assert
      expect(swapped).toBe(true);
      expect(battle.get(1).volatileState.abilityOverride).toBe('たんじゅん');
      expect(battle.get(2).volatileState.abilityOverride).toBe('いかく');
    });

    it('入れ替えられない特性（ふしぎなまもり）があれば失敗する', async () => {
      // Arrange
      const battle = createInMemoryBattle({ ability: 'ふしぎなまもり' }, { ability: 'いかく' });

      // Act
      const swapped = await swapAbilities(battle.get(1), battle.get(2), battle.context());

      // Assert
      expect(swapped).toBe(false);
      expect(battle.get(2).volatileState.abilityOverride).toBeUndefined();
    });
  });

  describe('suppressAbility', () => {
    it('abilitySuppressed を書く', async () => {
      // Arrange
      const battle = createInMemoryBattle({ ability: 'いかく' });

      // Act
      const suppressed = await suppressAbility(battle.get(1), battle.context());

      // Assert
      expect(suppressed).toBe(true);
      expect(battle.get(1).volatileState.abilitySuppressed).toBe(true);
    });

    it('消せない特性・すでに消されている特性は失敗する', async () => {
      // Arrange
      const battle = createInMemoryBattle(
        { ability: 'ダルマモード' },
        { ability: 'いかく', status: { volatileState: { abilitySuppressed: true } } },
      );

      // Act
      const cantSuppress = await suppressAbility(battle.get(1), battle.context());
      const already = await suppressAbility(battle.get(2), battle.context());

      // Assert
      expect(cantSuppress).toBe(false);
      expect(already).toBe(false);
    });
  });

  describe('findIllusionTarget', () => {
    const status = (id: number, trainerId: number, currentHp = 100): BattlePokemonStatus =>
      new BattlePokemonStatus(
        id,
        1,
        id,
        trainerId,
        false,
        currentHp,
        100,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        null,
      );

    it('手持ちの最後の、ひんしでないポケモンに化ける（本家と同じく、自分より後ろだけ）', () => {
      // Arrange
      const statuses = [status(1, 1), status(2, 2), status(3, 1), status(5, 1, 0), status(4, 1)];

      // Act
      const target = findIllusionTarget(statuses, statuses[0]);

      // Assert
      expect(target?.id).toBe(4);
    });

    it('自分が手持ちの最後なら、化けない', () => {
      // Arrange
      const statuses = [status(1, 1), status(3, 1)];

      // Act
      const target = findIllusionTarget(statuses, statuses[1]);

      // Assert
      expect(target).toBeUndefined();
    });
  });
});
