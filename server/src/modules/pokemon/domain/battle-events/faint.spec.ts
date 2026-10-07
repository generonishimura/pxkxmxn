import { AbilityRegistry } from '../abilities/ability-registry';
import { notifyFaint } from './faint';
import { createInMemoryBattle } from './__tests__/in-memory-battle';

describe('notifyFaint（ひんしを場の特性に知らせる）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('相手がひんしになったら、場のソウルハートの特攻を1段階上げて、メッセージを返す', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'ソウルハート' },
      { status: { currentHp: 0 } },
    );

    // Act
    const messages = await notifyFaint(get(2), context());

    // Assert
    expect(get(1).specialAttackRank).toBe(1);
    expect(messages).toEqual([{ holderId: 1, trainerId: 1, message: 'Special Attack rose!' }]);
  });

  it('ソウルハートを持つポケモン自身がひんしなら、特攻は上がらない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'ソウルハート', status: { currentHp: 0 } },
      { status: { currentHp: 0 } },
    );

    // Act
    const messages = await notifyFaint(get(2), context());

    // Assert
    expect(get(1).specialAttackRank).toBe(0);
    expect(messages).toEqual([]);
  });

  it('場にいないポケモンのソウルハートは、特攻が上がらない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'ソウルハート', status: { isActive: false } },
      { status: { currentHp: 0 } },
    );

    // Act
    await notifyFaint(get(2), context());

    // Assert
    expect(get(1).specialAttackRank).toBe(0);
  });

  it('いえきで特性が消されていれば、特攻は上がらない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'ソウルハート', status: { volatileState: { abilitySuppressed: true } } },
      { status: { currentHp: 0 } },
    );

    // Act
    await notifyFaint(get(2), context());

    // Assert
    expect(get(1).specialAttackRank).toBe(0);
  });
});
