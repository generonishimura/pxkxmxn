import { AbilityRegistry } from '../../ability-registry';
import { ItemRegistry } from '../../../items/item-registry';
import { HitResult } from '../../../battle-events/hit-result';
import {
  InMemoryPokemon,
  createInMemoryBattle,
} from '../../../battle-events/__tests__/in-memory-battle';

/**
 * マジシャンの持ち主（攻撃側）は ID 1、技を受けた相手は ID 2
 */
describe('MagicianEffect（マジシャン）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    ItemRegistry.initialize();
  });

  const hit = (moveCategory: HitResult['moveCategory'] = 'Special'): HitResult => ({
    damage: 30,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact: false,
    moveTypeName: 'エスパー',
    moveCategory,
    targetFainted: false,
  });
  const run = async (
    holder: InMemoryPokemon,
    target: InMemoryPokemon,
    moveCategory?: HitResult['moveCategory'],
  ) => {
    const battle = createInMemoryBattle({ ability: 'マジシャン', ...holder }, target);
    const message = await AbilityRegistry.get('マジシャン')?.onAfterMoveSecondarySelf?.(
      battle.get(1),
      battle.get(2),
      hit(moveCategory),
      battle.context(),
    );
    return { ...battle, message };
  };
  const holding = (item: string, data: InMemoryPokemon = {}): InMemoryPokemon => ({
    ...data,
    status: { ...data.status, persistentState: { item } },
  });

  it('攻撃技を当てたら、相手の持ち物を奪う', async () => {
    // Act
    const { get, message } = await run({}, holding('たべのこし'));

    // Assert
    expect(get(1).persistentState.item).toBe('たべのこし');
    expect(get(2).persistentState.item).toBeUndefined();
    expect(message).toBe("マジシャン stole the target's たべのこし!");
  });

  it('自分が持ち物を持っていれば奪わない', async () => {
    // Act
    const { get, message } = await run(holding('いのちのたま'), holding('たべのこし'));

    // Assert
    expect(get(2).persistentState.item).toBe('たべのこし');
    expect(message).toBeNull();
  });

  it('相手がねんちゃくなら奪えない', async () => {
    // Act
    const { get } = await run({}, holding('たべのこし', { ability: 'ねんちゃく' }));

    // Assert
    expect(get(2).persistentState.item).toBe('たべのこし');
    expect(get(1).persistentState.item).toBeUndefined();
  });

  it('相手がひんしになっても奪う（本家と同じ）', async () => {
    // Act
    const { get } = await run({}, holding('たべのこし', { status: { currentHp: 0 } }));

    // Assert
    expect(get(1).persistentState.item).toBe('たべのこし');
  });

  it('自分がひんしなら奪わない', async () => {
    // Act
    const { get } = await run({ status: { currentHp: 0 } }, holding('たべのこし'));

    // Assert
    expect(get(2).persistentState.item).toBe('たべのこし');
  });

  it('変化技では奪わない', async () => {
    // Act
    const { get } = await run({}, holding('たべのこし'), 'Status');

    // Assert
    expect(get(2).persistentState.item).toBe('たべのこし');
  });
});
