import { VolatileState } from '../state/volatile-state';
import { ABILITY_FLAGS, hasAbilityFlag } from './ability-flags';
import { findPokemonForm } from './pokemon-forms';
import {
  AbilityHolder,
  NEUTRALIZING_GAS_ABILITY_NAME,
  TYPELESS_TYPE_NAME,
  currentAbilityName,
  emitsNeutralizingGas,
  resolveEffectiveAbilityName,
  resolveEffectiveTypeNames,
} from './effective-traits';

const holder = (
  baseAbilityName: string | undefined,
  volatileState: VolatileState = {},
  fainted = false,
): AbilityHolder => ({ baseAbilityName, volatileState, fainted });

describe('ability-flags', () => {
  it('バトルスイッチは消せない・入れ替えられない特性', () => {
    // Arrange
    const name = 'バトルスイッチ';

    // Act
    const cantSuppress = hasAbilityFlag(name, 'cantSuppress');
    const failSkillSwap = hasAbilityFlag(name, 'failSkillSwap');

    // Assert
    expect(cantSuppress).toBe(true);
    expect(failSkillSwap).toBe(true);
  });

  it('表にない特性はどのフラグも持たない', () => {
    // Arrange
    const name = 'いかく';

    // Act
    const flagged = hasAbilityFlag(name, 'cantSuppress');

    // Assert
    expect(flagged).toBe(false);
  });

  it('うのミサイルは消せないが、なりきりで写せる（本家の flags と同じ）', () => {
    // Arrange
    const name = 'うのミサイル';

    // Act
    const flags = ABILITY_FLAGS[name];

    // Assert
    expect(flags).toEqual(['cantSuppress', 'noTransform']);
  });

  it('ＡＲシステムは全角の名前で引ける', () => {
    // Arrange
    const name = 'ＡＲシステム';

    // Act
    const cantSuppress = hasAbilityFlag(name, 'cantSuppress');

    // Assert
    expect(cantSuppress).toBe(true);
  });
});

describe('pokemon-forms', () => {
  it('ギルガルドのブレードフォルムの種族値を引ける', () => {
    // Arrange
    const nationalDex = 681;

    // Act
    const form = findPokemonForm(nationalDex, 'blade');

    // Assert
    expect(form?.baseStats).toEqual({
      hp: 60,
      attack: 140,
      defense: 50,
      specialAttack: 140,
      specialDefense: 50,
      speed: 60,
    });
    expect(form?.types).toEqual(['はがね', 'ゴースト']);
  });

  it('ジガルデのパーフェクトフォルムは HP の種族値が 216', () => {
    // Arrange
    const nationalDex = 718;

    // Act
    const form = findPokemonForm(nationalDex, 'complete');

    // Assert
    expect(form?.baseStats.hp).toBe(216);
  });

  it('ちがうポケモンのフォルム名では引けない', () => {
    // Arrange
    const nationalDex = 25;

    // Act
    const form = findPokemonForm(nationalDex, 'blade');

    // Assert
    expect(form).toBeUndefined();
  });
});

describe('resolveEffectiveAbilityName', () => {
  it('上書きがなければ、もとの特性を返す', () => {
    // Arrange
    const pokemon = holder('いかく');

    // Act
    const name = resolveEffectiveAbilityName(pokemon);

    // Assert
    expect(name).toBe('いかく');
  });

  it('abilityOverride があれば、その特性を返す', () => {
    // Arrange
    const pokemon = holder('いかく', { abilityOverride: 'たんじゅん' });

    // Act
    const name = resolveEffectiveAbilityName(pokemon);

    // Assert
    expect(name).toBe('たんじゅん');
  });

  it('abilitySuppressed なら、特性はない', () => {
    // Arrange
    const pokemon = holder('いかく', { abilitySuppressed: true });

    // Act
    const name = resolveEffectiveAbilityName(pokemon);

    // Assert
    expect(name).toBeUndefined();
  });

  it('消せない特性は abilitySuppressed でも残る', () => {
    // Arrange
    const pokemon = holder('バトルスイッチ', { abilitySuppressed: true });

    // Act
    const name = resolveEffectiveAbilityName(pokemon);

    // Assert
    expect(name).toBe('バトルスイッチ');
  });

  it('相手のかがくへんかガスで、特性はない', () => {
    // Arrange
    const pokemon = holder('いかく');
    const opponent = holder(NEUTRALIZING_GAS_ABILITY_NAME);

    // Act
    const name = resolveEffectiveAbilityName(pokemon, [opponent]);

    // Assert
    expect(name).toBeUndefined();
  });

  it('かがくへんかガスの持ち主は、相手のかがくへんかガスでも特性が残る', () => {
    // Arrange
    const pokemon = holder(NEUTRALIZING_GAS_ABILITY_NAME);
    const opponent = holder(NEUTRALIZING_GAS_ABILITY_NAME);

    // Act
    const name = resolveEffectiveAbilityName(pokemon, [opponent]);

    // Assert
    expect(name).toBe(NEUTRALIZING_GAS_ABILITY_NAME);
  });

  it('消せない特性は、相手のかがくへんかガスでも残る', () => {
    // Arrange
    const pokemon = holder('ばけのかわ');
    const opponent = holder(NEUTRALIZING_GAS_ABILITY_NAME);

    // Act
    const name = resolveEffectiveAbilityName(pokemon, [opponent]);

    // Assert
    expect(name).toBe('ばけのかわ');
  });

  it('ひんし・いえき・へんしん中のかがくへんかガスは、ほかの特性を消さない', () => {
    // Arrange
    const pokemon = holder('いかく');
    const others = [
      holder(NEUTRALIZING_GAS_ABILITY_NAME, {}, true),
      holder(NEUTRALIZING_GAS_ABILITY_NAME, { abilitySuppressed: true }),
      holder(NEUTRALIZING_GAS_ABILITY_NAME, { transformedIntoStatusId: 9 }),
    ];

    // Act
    const name = resolveEffectiveAbilityName(pokemon, others);

    // Assert
    expect(name).toBe('いかく');
    expect(others.some(emitsNeutralizingGas)).toBe(false);
  });

  it('へんしん中は、notransform の特性（ばけのかわ）が効かない', () => {
    // Arrange
    const pokemon = holder('かわりもの', {
      transformedIntoStatusId: 2,
      abilityOverride: 'ばけのかわ',
    });

    // Act
    const name = resolveEffectiveAbilityName(pokemon);

    // Assert
    expect(name).toBeUndefined();
    expect(currentAbilityName(pokemon)).toBe('ばけのかわ');
  });
});

describe('resolveEffectiveTypeNames', () => {
  it('上書きがなければ、もとのタイプを返す', () => {
    // Arrange
    const params = { baseTypeNames: ['ほのお', 'ひこう'], volatileState: {} };

    // Act
    const types = resolveEffectiveTypeNames(params);

    // Assert
    expect(types).toEqual(['ほのお', 'ひこう']);
  });

  it('フォルムのタイプは、もとのタイプより優先する', () => {
    // Arrange
    const params = {
      baseTypeNames: ['ほのお'],
      volatileState: {},
      formTypeNames: ['ほのお', 'エスパー'],
    };

    // Act
    const types = resolveEffectiveTypeNames(params);

    // Assert
    expect(types).toEqual(['ほのお', 'エスパー']);
  });

  it('typeOverride は、フォルムのタイプより優先する', () => {
    // Arrange
    const params = {
      baseTypeNames: ['ほのお'],
      volatileState: { typeOverride: ['みず'] },
      formTypeNames: ['ほのお', 'エスパー'],
    };

    // Act
    const types = resolveEffectiveTypeNames(params);

    // Assert
    expect(types).toEqual(['みず']);
  });

  it('はねやすめのターンは、ひこうタイプを失う', () => {
    // Arrange
    const params = { baseTypeNames: ['ほのお', 'ひこう'], volatileState: { roosting: true } };

    // Act
    const types = resolveEffectiveTypeNames(params);

    // Assert
    expect(types).toEqual(['ほのお']);
  });

  it('ひこうタイプだけのポケモンがはねやすめをすると、ノーマルタイプになる', () => {
    // Arrange
    const params = { baseTypeNames: ['ひこう'], volatileState: { roosting: true } };

    // Act
    const types = resolveEffectiveTypeNames(params);

    // Assert
    expect(types).toEqual(['ノーマル']);
  });

  it('もえつきるのあと（???/ひこう）にはねやすめをすると、タイプなし（???）になる', () => {
    // Arrange
    const params = {
      baseTypeNames: ['ほのお', 'ひこう'],
      volatileState: { typeOverride: [TYPELESS_TYPE_NAME, 'ひこう'], roosting: true },
    };

    // Act
    const types = resolveEffectiveTypeNames(params);

    // Assert
    expect(types).toEqual([TYPELESS_TYPE_NAME]);
  });

  it('addedType は 3 つめのタイプとして足す（すでに持っていれば足さない）', () => {
    // Arrange
    const added = { baseTypeNames: ['みず', 'じめん'], volatileState: { addedType: 'くさ' } };
    const already = { baseTypeNames: ['くさ'], volatileState: { addedType: 'くさ' } };

    // Act
    const addedTypes = resolveEffectiveTypeNames(added);
    const alreadyTypes = resolveEffectiveTypeNames(already);

    // Assert
    expect(addedTypes).toEqual(['みず', 'じめん', 'くさ']);
    expect(alreadyTypes).toEqual(['くさ']);
  });

  it('excludeAddedType なら addedType を足さない（へんしんで写すとき）', () => {
    // Arrange
    const params = {
      baseTypeNames: ['みず'],
      volatileState: { addedType: 'ゴースト', roosting: true },
      excludeAddedType: true,
      ignoreRoost: true,
    };

    // Act
    const types = resolveEffectiveTypeNames(params);

    // Assert
    expect(types).toEqual(['みず']);
  });
});
