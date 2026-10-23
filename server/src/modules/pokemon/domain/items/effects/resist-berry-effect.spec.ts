import { AbilityRegistry } from '../../abilities/ability-registry';
import { BattleContext } from '../../abilities/battle-context.interface';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { ItemRegistry } from '../item-registry';

describe('ダメージを半分にするきのみ', () => {
  beforeEach(() => {
    ItemRegistry.initialize();
  });

  const setup = (item: string, volatileState = {}) => {
    const battle = createInMemoryBattle(
      {},
      { status: { volatileState, persistentState: { item } } },
    );
    const modifyDamage = (damage: number, data: Partial<BattleContext>) =>
      Promise.resolve(
        ItemRegistry.get(item)?.modifyDamage?.(battle.get(2), damage, battle.context(data)),
      );
    return { ...battle, modifyDamage };
  };

  describe.each([
    ['オッカのみ', 'ほのお'],
    ['イトケのみ', 'みず'],
    ['ソクノのみ', 'でんき'],
    ['リンドのみ', 'くさ'],
    ['ヤチェのみ', 'こおり'],
    ['ヨプのみ', 'かくとう'],
    ['ビアーのみ', 'どく'],
    ['シュカのみ', 'じめん'],
    ['バコウのみ', 'ひこう'],
    ['ウタンのみ', 'エスパー'],
    ['タンガのみ', 'むし'],
    ['ヨロギのみ', 'いわ'],
    ['カシブのみ', 'ゴースト'],
    ['ハバンのみ', 'ドラゴン'],
    ['ナモのみ', 'あく'],
    ['リリバのみ', 'はがね'],
    ['ロゼルのみ', 'フェアリー'],
  ])('%s（%s）', (item, typeName) => {
    it('効果抜群の技を受けたら、食べてダメージを半分にする', async () => {
      // Arrange
      const { modifyDamage, get } = setup(item);

      // Act
      const damage = await modifyDamage(100, { moveTypeName: typeName, typeEffectiveness: 2 });

      // Assert
      expect(damage).toBe(50);
      expect(get(2).persistentState.item).toBeUndefined();
      expect(get(2).persistentState.consumedItem).toBe(item);
    });

    it('効果が等倍の技では食べない', async () => {
      // Arrange
      const { modifyDamage, get } = setup(item);

      // Act
      const damage = await modifyDamage(100, { moveTypeName: typeName, typeEffectiveness: 1 });

      // Assert
      expect(damage).toBeUndefined();
      expect(get(2).persistentState.item).toBe(item);
    });
  });

  it('効果抜群のきのみは、ほかのタイプの技では食べない', async () => {
    // Arrange
    const { modifyDamage, get } = setup('オッカのみ');

    // Act
    const damage = await modifyDamage(100, { moveTypeName: 'みず', typeEffectiveness: 2 });

    // Assert
    expect(damage).toBeUndefined();
    expect(get(2).persistentState.item).toBe('オッカのみ');
  });

  it('4 倍の弱点でも半分にする', async () => {
    // Arrange
    const { modifyDamage } = setup('ヤチェのみ');

    // Act
    const damage = await modifyDamage(400, { moveTypeName: 'こおり', typeEffectiveness: 4 });

    // Assert
    expect(damage).toBe(200);
  });

  describe('ホズのみ', () => {
    it('ノーマルの技なら、効果が等倍でも食べてダメージを半分にする', async () => {
      // Arrange
      const { modifyDamage, get } = setup('ホズのみ');

      // Act
      const damage = await modifyDamage(100, { moveTypeName: 'ノーマル', typeEffectiveness: 1 });

      // Assert
      expect(damage).toBe(50);
      expect(get(2).persistentState.consumedItem).toBe('ホズのみ');
    });

    it('効果がいまひとつでも食べる', async () => {
      // Arrange
      const { modifyDamage } = setup('ホズのみ');

      // Act
      const damage = await modifyDamage(100, {
        moveTypeName: 'ノーマル',
        typeEffectiveness: 0.5,
      });

      // Assert
      expect(damage).toBe(50);
    });

    it('効果がない技（ゴーストへのノーマル技）では食べない', async () => {
      // Arrange
      const { modifyDamage, get } = setup('ホズのみ');

      // Act
      const damage = await modifyDamage(100, { moveTypeName: 'ノーマル', typeEffectiveness: 0 });

      // Assert
      expect(damage).toBeUndefined();
      expect(get(2).persistentState.item).toBe('ホズのみ');
    });

    it('ノーマル以外の技では食べない', async () => {
      // Arrange
      const { modifyDamage } = setup('ホズのみ');

      // Act
      const damage = await modifyDamage(100, { moveTypeName: 'ほのお', typeEffectiveness: 1 });

      // Assert
      expect(damage).toBeUndefined();
    });
  });

  describe('みがわり', () => {
    it('みがわりに当たる技では食べない', async () => {
      // Arrange
      const { modifyDamage, get } = setup('オッカのみ', { substituteHp: 25 });

      // Act
      const damage = await modifyDamage(100, {
        moveTypeName: 'ほのお',
        typeEffectiveness: 2,
        bypassesSubstitute: false,
      });

      // Assert
      expect(damage).toBeUndefined();
      expect(get(2).persistentState.item).toBe('オッカのみ');
    });

    it('みがわりを無視する技（音技・すりぬけ）なら食べる', async () => {
      // Arrange
      const { modifyDamage } = setup('オッカのみ', { substituteHp: 25 });

      // Act
      const damage = await modifyDamage(100, {
        moveTypeName: 'ほのお',
        typeEffectiveness: 2,
        bypassesSubstitute: true,
      });

      // Assert
      expect(damage).toBe(50);
    });
  });

  it('リポジトリがない（ダメージの見積もり）ときは、食べられないので半分にしない', async () => {
    // Arrange
    const { modifyDamage } = setup('オッカのみ');

    // Act
    const damage = await modifyDamage(100, {
      battleRepository: undefined,
      moveTypeName: 'ほのお',
      typeEffectiveness: 2,
    });

    // Assert
    expect(damage).toBeUndefined();
  });
});

describe('ダメージを半分にするきのみと、食べる側・相手の特性', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    ItemRegistry.initialize();
  });

  const setupWithAbilities = (holderAbility?: string, attackerAbility?: string) => {
    const battle = createInMemoryBattle(
      { ability: attackerAbility },
      { ability: holderAbility, status: { persistentState: { item: 'オッカのみ' } } },
    );
    const modifyDamage = () =>
      Promise.resolve(
        ItemRegistry.get('オッカのみ')?.modifyDamage?.(
          battle.get(2),
          100,
          battle.context({ moveTypeName: 'ほのお', typeEffectiveness: 2 }),
        ),
      );
    return { ...battle, modifyDamage };
  };

  it('じゅくせいなら、ダメージを 1/4 にする', async () => {
    // Arrange
    const { modifyDamage } = setupWithAbilities('じゅくせい');

    // Act
    const damage = await modifyDamage();

    // Assert
    expect(damage).toBe(25);
  });

  it('相手がきんちょうかんなら、食べずにダメージをそのままにする', async () => {
    // Arrange
    const { modifyDamage, get } = setupWithAbilities(undefined, 'きんちょうかん');

    // Act
    const damage = await modifyDamage();

    // Assert
    expect(damage).toBeUndefined();
    expect(get(2).persistentState.item).toBe('オッカのみ');
  });
});
