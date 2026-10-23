import { Field, Weather } from '@/modules/battle/domain/entities/battle.entity';
import { getGlobalFieldState, getSideConditions } from '@/modules/battle/domain/state/side-state';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { MoveRegistry } from '../../moves/move-registry';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { ItemRegistry } from '../item-registry';

/**
 * 場の状態を長くする持ち物（ひかりのねんど・あついいわ・つめたいいわ・さらさらいわ・しめったいわ・グランドコート）
 */
describe('場の状態を長くする持ち物', () => {
  const holding = (item: string) => ({ status: { persistentState: { item } } });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.initialize();
    ItemRegistry.initialize();
  });

  describe('ひかりのねんど', () => {
    it.each([
      ['リフレクター', 'reflectTurns'],
      ['ひかりのかべ', 'lightScreenTurns'],
    ] as const)('%s を 8 ターンにする', async (moveName, key) => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle(holding('ひかりのねんど'));

      // Act
      await MoveRegistry.get(moveName)?.onUse?.(get(1), get(2), context());

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(getSideConditions(battle.sideState, 1)[key]).toBe(8);
    });

    it('オーロラベールを 8 ターンにする', () => {
      // Act
      const turns = ItemRegistry.get('ひかりのねんど')?.modifyFieldTurns?.(
        createInMemoryBattle().get(1),
        { kind: 'sideCondition', key: 'auroraVeilTurns' },
        5,
      );

      // Assert
      expect(turns).toBe(8);
    });

    it('おいかぜのターン数は変えない', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle(holding('ひかりのねんど'));

      // Act
      await MoveRegistry.get('おいかぜ')?.onUse?.(get(1), get(2), context());

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(getSideConditions(battle.sideState, 1).tailwindTurns).toBe(4);
    });
  });

  describe('天候を長くするいわ', () => {
    it.each([
      ['あついいわ', 'にほんばれ', Weather.Sun],
      ['つめたいいわ', 'あられ', Weather.Hail],
      ['さらさらいわ', 'すなあらし', Weather.Sandstorm],
      ['しめったいわ', 'あまごい', Weather.Rain],
    ])('%s を持って %s を使うと、8 ターンにする', async (item, moveName, weather) => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle(holding(item));

      // Act
      await MoveRegistry.get(moveName)?.onUse?.(get(1), get(2), context());

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(battle.weather).toBe(weather);
      expect(getGlobalFieldState(battle.sideState).weatherTurns).toBe(8);
    });

    it('特性で出した天候も 8 ターンにする（しめったいわ・あめふらし）', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle({
        ability: 'あめふらし',
        ...holding('しめったいわ'),
      });

      // Act
      await AbilityRegistry.get('あめふらし')?.onEntry?.(get(1), context());

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(getGlobalFieldState(battle.sideState).weatherTurns).toBe(8);
    });

    it('ほかの天候は 5 ターンのまま（あついいわであまごい）', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle(holding('あついいわ'));

      // Act
      await MoveRegistry.get('あまごい')?.onUse?.(get(1), get(2), context());

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(getGlobalFieldState(battle.sideState).weatherTurns).toBe(5);
    });

    it('相手が持っていても、自分が出した天候は 5 ターンのまま', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle({}, holding('しめったいわ'));

      // Act
      await MoveRegistry.get('あまごい')?.onUse?.(get(1), get(2), context());

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(getGlobalFieldState(battle.sideState).weatherTurns).toBe(5);
    });
  });

  describe('グランドコート', () => {
    it('技で出したフィールドを 8 ターンにする', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle(holding('グランドコート'));

      // Act
      await MoveRegistry.get('グラスフィールド')?.onUse?.(get(1), get(2), context());

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(battle.field).toBe(Field.GrassyTerrain);
      expect(getGlobalFieldState(battle.sideState).terrainTurns).toBe(8);
    });

    it('特性で出したフィールドも 8 ターンにする（エレキメイカー）', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle({
        ability: 'エレキメイカー',
        ...holding('グランドコート'),
      });

      // Act
      await AbilityRegistry.get('エレキメイカー')?.onEntry?.(get(1), context());

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(battle.field).toBe(Field.ElectricTerrain);
      expect(getGlobalFieldState(battle.sideState).terrainTurns).toBe(8);
    });
  });
});
