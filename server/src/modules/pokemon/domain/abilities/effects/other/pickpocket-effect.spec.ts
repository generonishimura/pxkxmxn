import { BattleContext } from '../../battle-context.interface';
import { AbilityRegistry } from '../../ability-registry';
import { ItemRegistry } from '../../../items/item-registry';
import { HitResult } from '../../../battle-events/hit-result';
import {
  InMemoryPokemon,
  createInMemoryBattle,
} from '../../../battle-events/__tests__/in-memory-battle';

/**
 * 攻撃側は ID 1、わるいてぐせの持ち主（防御側）は ID 2
 */
describe('PickpocketEffect（わるいてぐせ）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    ItemRegistry.initialize();
  });

  const hit = (isContact: boolean): HitResult => ({
    damage: 30,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact,
    moveTypeName: 'ノーマル',
    moveCategory: 'Physical',
    targetFainted: false,
  });
  const run = async (
    attacker: InMemoryPokemon,
    holder: InMemoryPokemon,
    options: { isContact?: boolean; context?: Partial<BattleContext> } = {},
  ) => {
    const battle = createInMemoryBattle(attacker, { ability: 'わるいてぐせ', ...holder });
    const message = await AbilityRegistry.get('わるいてぐせ')?.onAfterMoveHit?.(
      battle.get(2),
      battle.get(1),
      hit(options.isContact ?? true),
      battle.context(options.context),
    );
    return { ...battle, message };
  };
  const holding = (item: string, data: InMemoryPokemon = {}): InMemoryPokemon => ({
    ...data,
    status: { ...data.status, persistentState: { item } },
  });

  it('接触技を受けたら、攻撃側の持ち物を奪う', async () => {
    // Act
    const { get, message } = await run(holding('こだわりスカーフ'), {});

    // Assert
    expect(get(2).persistentState.item).toBe('こだわりスカーフ');
    expect(get(1).persistentState.item).toBeUndefined();
    expect(message).toBe("わるいてぐせ stole the attacker's こだわりスカーフ!");
  });

  it('接触しない技では奪わない', async () => {
    // Act
    const { get, message } = await run(holding('こだわりスカーフ'), {}, { isContact: false });

    // Assert
    expect(get(1).persistentState.item).toBe('こだわりスカーフ');
    expect(message).toBeNull();
  });

  it('自分が持ち物を持っていれば奪わない', async () => {
    // Act
    const { get } = await run(holding('こだわりスカーフ'), holding('たべのこし'));

    // Assert
    expect(get(1).persistentState.item).toBe('こだわりスカーフ');
    expect(get(2).persistentState.item).toBe('たべのこし');
  });

  it('攻撃側がねんちゃくなら奪えない', async () => {
    // Act
    const { get, message } = await run(holding('こだわりスカーフ', { ability: 'ねんちゃく' }), {});

    // Assert
    expect(get(1).persistentState.item).toBe('こだわりスカーフ');
    expect(message).toBeNull();
  });

  it('ひんしになったら奪わない', async () => {
    // Act
    const { get } = await run(holding('こだわりスカーフ'), { status: { currentHp: 0 } });

    // Assert
    expect(get(1).persistentState.item).toBe('こだわりスカーフ');
  });

  it('ちからずくで追加効果が消えた技では奪わない（本家の AfterMoveSecondary が起きない）', async () => {
    // Act
    const { get } = await run(
      holding('こだわりスカーフ'),
      {},
      {
        context: { secondaryEffectsRemoved: true },
      },
    );

    // Assert
    expect(get(1).persistentState.item).toBe('こだわりスカーフ');
  });
});
