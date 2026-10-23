import { ItemRegistry } from '../item-registry';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 素早さ・行動順の持ち物（こだわりスカーフ・せんせいのツメ・くろいてっきゅう）
 */
describe('素早さ・行動順の持ち物', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
  const context = (overrides: Partial<BattleContext> = {}): BattleContext => ({
    battle,
    movePriority: 0,
    moveCategory: 'Physical',
    ...overrides,
  });

  beforeEach(() => {
    ItemRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('こだわりスカーフ', () => {
    it('素早さを 1.5 倍にする（端数は切り捨て）', () => {
      // Act
      const speed = ItemRegistry.get('こだわりスカーフ')?.modifySpeed?.(pokemon, 101, context());

      // Assert
      expect(speed).toBe(151);
    });

    it('最初に出した技に固定する（locksMoveChoice）', () => {
      // Act
      const locks = ItemRegistry.get('こだわりスカーフ')?.locksMoveChoice;

      // Assert
      expect(locks).toBe(true);
    });
  });

  describe('せんせいのツメ', () => {
    it('20% の確率で、優先度に 0.1 を足す', () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0.19);

      // Act
      const fraction = ItemRegistry.get('せんせいのツメ')?.modifyFractionalPriority?.(
        pokemon,
        context(),
      );

      // Assert
      expect(fraction).toBe(0.1);
    });

    it('乱数が 20% に入らなければ、何もしない', () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0.2);

      // Act
      const fraction = ItemRegistry.get('せんせいのツメ')?.modifyFractionalPriority?.(
        pokemon,
        context(),
      );

      // Assert
      expect(fraction).toBeUndefined();
    });

    it('優先度が 1 以上の技では発動しない', () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0);

      // Act
      const fraction = ItemRegistry.get('せんせいのツメ')?.modifyFractionalPriority?.(
        pokemon,
        context({ movePriority: 1 }),
      );

      // Assert
      expect(fraction).toBeUndefined();
    });

    it('きんしのちからで変化技を出すときは発動しない', () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0);

      // Act
      const fraction = ItemRegistry.get('せんせいのツメ')?.modifyFractionalPriority?.(
        pokemon,
        context({ moveCategory: 'Status', attackerAbilityName: 'きんしのちから' }),
      );

      // Assert
      expect(fraction).toBeUndefined();
    });
  });

  describe('くろいてっきゅう', () => {
    it('素早さを半分にする（端数は切り捨て）', () => {
      // Act
      const speed = ItemRegistry.get('くろいてっきゅう')?.modifySpeed?.(pokemon, 101, context());

      // Assert
      expect(speed).toBe(50);
    });
  });
});
