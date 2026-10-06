import { Field } from '../entities/battle.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import {
  effectivePrimalWeather,
  fieldBasePowerModifiers,
  isTrickRoomActive,
  movesBefore,
  primalWeatherBlocksMove,
  screenDamageModifier,
  sideSpeedMultiplier,
  swapDefensesInWonderRoom,
} from './field-modifiers';

describe('field-modifiers', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('screenDamageModifier', () => {
    it('リフレクターは物理技のダメージを半分（2048/4096）にする', () => {
      // Act
      const modifier = screenDamageModifier({ reflectTurns: 3 }, 'Physical');

      // Assert
      expect(modifier).toBe(2048);
    });

    it('リフレクターは特殊技には効かない', () => {
      // Act
      const modifier = screenDamageModifier({ reflectTurns: 3 }, 'Special');

      // Assert
      expect(modifier).toBeUndefined();
    });

    it('ひかりのかべは特殊技のダメージを半分にする', () => {
      // Act
      const modifier = screenDamageModifier({ lightScreenTurns: 2 }, 'Special');

      // Assert
      expect(modifier).toBe(2048);
    });

    it.each(['Physical', 'Special'] as const)(
      'オーロラベールは %s 技のダメージを半分にする',
      category => {
        // Act
        const modifier = screenDamageModifier({ auroraVeilTurns: 5 }, category);

        // Assert
        expect(modifier).toBe(2048);
      },
    );

    it('リフレクターとオーロラベールが両方あっても半分にするのは 1 回だけ', () => {
      // Act
      const modifier = screenDamageModifier({ reflectTurns: 5, auroraVeilTurns: 5 }, 'Physical');

      // Assert
      expect(modifier).toBe(2048);
    });

    it('急所に当たったときは壁が効かない', () => {
      // Act
      const modifier = screenDamageModifier({ reflectTurns: 5 }, 'Physical', {
        isCriticalHit: true,
      });

      // Assert
      expect(modifier).toBeUndefined();
    });

    it('すりぬけの攻撃は壁が効かない', () => {
      // Act
      const modifier = screenDamageModifier({ auroraVeilTurns: 5 }, 'Special', {
        infiltrates: true,
      });

      // Assert
      expect(modifier).toBeUndefined();
    });
  });

  describe('sideSpeedMultiplier / movesBefore', () => {
    it('おいかぜの陣営の素早さは 2 倍', () => {
      // Act
      const multiplier = sideSpeedMultiplier({ tailwindTurns: 4 });

      // Assert
      expect(multiplier).toBe(2);
    });

    it('おいかぜがなければ 1 倍', () => {
      // Act
      const multiplier = sideSpeedMultiplier({});

      // Assert
      expect(multiplier).toBe(1);
    });

    it('トリックルームの間は、遅い方が先に動く', () => {
      // Arrange
      const sideState = { global: { trickRoomTurns: 3 } };

      // Act
      const slowFirst = movesBefore(50, 100, isTrickRoomActive(sideState));

      // Assert
      expect(slowFirst).toBe(true);
    });

    it('トリックルームがなければ、速い方が先に動き、同じ速さなら先に渡した方が先', () => {
      // Act
      const fastFirst = movesBefore(100, 50, isTrickRoomActive({}));
      const tie = movesBefore(80, 80, isTrickRoomActive({}));

      // Assert
      expect(fastFirst).toBe(true);
      expect(tie).toBe(true);
    });
  });

  describe('swapDefensesInWonderRoom', () => {
    it('ワンダールームの間は、防御と特防の実数値を入れ替える', () => {
      // Arrange
      const stats = { attack: 1, defense: 120, specialAttack: 3, specialDefense: 80, speed: 5 };

      // Act
      const swapped = swapDefensesInWonderRoom(stats, { global: { wonderRoomTurns: 4 } });

      // Assert
      expect(swapped).toEqual({ ...stats, defense: 80, specialDefense: 120 });
    });

    it('ワンダールームがなければ、そのまま返す', () => {
      // Arrange
      const stats = { attack: 1, defense: 120, specialAttack: 3, specialDefense: 80, speed: 5 };

      // Act
      const result = swapDefensesInWonderRoom(stats, {});

      // Assert
      expect(result).toBe(stats);
    });
  });

  describe('fieldBasePowerModifiers', () => {
    const grounded = { attackerGrounded: true, defenderGrounded: true };

    it.each([
      [Field.ElectricTerrain, 'でんき'],
      [Field.GrassyTerrain, 'くさ'],
      [Field.PsychicTerrain, 'エスパー'],
    ])('%s で地面にいるポケモンの %s 技は 1.3 倍（5325/4096）', (field, moveTypeName) => {
      // Act
      const modifiers = fieldBasePowerModifiers({
        field,
        sideState: {},
        moveTypeName,
        moveName: 'テスト',
        ...grounded,
      });

      // Assert
      expect(modifiers).toEqual([5325]);
    });

    it('地面にいないポケモンの技は、フィールドで強くならない', () => {
      // Act
      const modifiers = fieldBasePowerModifiers({
        field: Field.ElectricTerrain,
        sideState: {},
        moveTypeName: 'でんき',
        moveName: '10まんボルト',
        attackerGrounded: false,
        defenderGrounded: true,
      });

      // Assert
      expect(modifiers).toEqual([]);
    });

    it.each(['じしん', 'じならし', 'マグニチュード'])(
      'グラスフィールドでは、地面にいる相手への %s は半分',
      moveName => {
        // Act
        const modifiers = fieldBasePowerModifiers({
          field: Field.GrassyTerrain,
          sideState: {},
          moveTypeName: 'じめん',
          moveName,
          ...grounded,
        });

        // Assert
        expect(modifiers).toEqual([2048]);
      },
    );

    it('ミストフィールドでは、地面にいる相手へのドラゴン技は半分', () => {
      // Act
      const modifiers = fieldBasePowerModifiers({
        field: Field.MistyTerrain,
        sideState: {},
        moveTypeName: 'ドラゴン',
        moveName: 'りゅうのはどう',
        ...grounded,
      });

      // Assert
      expect(modifiers).toEqual([2048]);
    });

    it('隠れている相手には、グラスフィールドの半減は効かない', () => {
      // Act
      const modifiers = fieldBasePowerModifiers({
        field: Field.GrassyTerrain,
        sideState: {},
        moveTypeName: 'じめん',
        moveName: 'じしん',
        ...grounded,
        defenderSemiInvulnerable: true,
      });

      // Assert
      expect(modifiers).toEqual([]);
    });

    it.each([
      [{ mudSportTurns: 3 }, 'でんき'],
      [{ waterSportTurns: 3 }, 'ほのお'],
    ])('%p の間は %s 技が 1352/4096 になる', (global, moveTypeName) => {
      // Act
      const modifiers = fieldBasePowerModifiers({
        field: null,
        sideState: { global },
        moveTypeName,
        moveName: 'テスト',
        ...grounded,
      });

      // Assert
      expect(modifiers).toEqual([1352]);
    });
  });

  describe('primal weather', () => {
    it('おおあめでは、ほのおの攻撃技が失敗する', () => {
      // Act
      const blocked = primalWeatherBlocksMove('heavyRain', 'ほのお', 'Special');

      // Assert
      expect(blocked).toBe(true);
    });

    it('おおあめでも、ほのおの変化技は失敗しない', () => {
      // Act
      const blocked = primalWeatherBlocksMove('heavyRain', 'ほのお', 'Status');

      // Assert
      expect(blocked).toBe(false);
    });

    it('おおひでりでは、みずの攻撃技が失敗する', () => {
      // Act
      const blocked = primalWeatherBlocksMove('harshSunlight', 'みず', 'Physical');

      // Assert
      expect(blocked).toBe(true);
    });

    it('ノーてんきが場にいれば、ゲンシ天候の効果はない', () => {
      // Arrange
      const sideState = { global: { primalWeather: 'strongWinds' as const } };

      // Act
      const active = effectivePrimalWeather(sideState, ['ノーてんき']);
      const withoutCloudNine = effectivePrimalWeather(sideState, ['いかく']);

      // Assert
      expect(active).toBeUndefined();
      expect(withoutCloudNine).toBe('strongWinds');
    });
  });
});
