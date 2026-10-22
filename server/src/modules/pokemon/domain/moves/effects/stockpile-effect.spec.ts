import { StockpileEffect } from './stockpile-effect';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { createStatefulMoveContext, createStatus } from './__tests__/stateful-move-context';

describe('StockpileEffect（たくわえる）', () => {
  beforeAll(() => {
    AbilityRegistry.initialize();
  });

  const setup = (attackerSeed: Parameters<typeof createStatus>[0]) => {
    const attacker = createStatus(attackerSeed);
    const defender = createStatus({ id: 2 });
    return { attacker, defender, ...createStatefulMoveContext({ attacker, defender }) };
  };

  it('初めて使うと、たくわえた回数が 1 になり、防御・特防が 1 段階ずつ上がる', async () => {
    // Arrange
    const effect = new StockpileEffect();
    const { attacker, defender, ctx, latest } = setup({ id: 1 });

    // Act
    const message = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(latest(1).defenseRank).toBe(1);
    expect(latest(1).specialDefenseRank).toBe(1);
    expect(latest(1).volatileState.stockpileCount).toBe(1);
    expect(latest(1).volatileState.stockpileBoosts).toEqual({ defense: 1, specialDefense: 1 });
    expect(message).toBe('stockpiled 1! Defense rose! Special Defense rose!');
  });

  it('2 回目は、たくわえた回数と上がったランクの数を 1 ずつ足す', async () => {
    // Arrange
    const effect = new StockpileEffect();
    const { attacker, defender, ctx, latest } = setup({
      id: 1,
      defenseRank: 1,
      specialDefenseRank: 1,
      volatileState: { stockpileCount: 1, stockpileBoosts: { defense: 1, specialDefense: 1 } },
    });

    // Act
    const message = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(latest(1).volatileState.stockpileCount).toBe(2);
    expect(latest(1).volatileState.stockpileBoosts).toEqual({ defense: 2, specialDefense: 2 });
    expect(message).toBe('stockpiled 2! Defense rose! Special Defense rose!');
  });

  it('防御が +6 で上がらなかったときは、防御の分を数えない', async () => {
    // Arrange
    const effect = new StockpileEffect();
    const { attacker, defender, ctx, latest } = setup({ id: 1, defenseRank: 6 });

    // Act
    const message = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(latest(1).volatileState.stockpileCount).toBe(1);
    expect(latest(1).volatileState.stockpileBoosts).toEqual({ defense: 0, specialDefense: 1 });
    expect(message).toBe('stockpiled 1! Special Defense rose!');
  });

  it('防御・特防がどちらも +6 でも、たくわえることはできる', async () => {
    // Arrange
    const effect = new StockpileEffect();
    const { attacker, defender, ctx, latest } = setup({
      id: 1,
      defenseRank: 6,
      specialDefenseRank: 6,
    });

    // Act
    const message = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(latest(1).volatileState.stockpileCount).toBe(1);
    expect(latest(1).volatileState.stockpileBoosts).toEqual({ defense: 0, specialDefense: 0 });
    expect(message).toBe('stockpiled 1!');
  });

  it('たんじゅんで 2 段階上がっても、1 回分として 1 を数える', async () => {
    // Arrange
    const effect = new StockpileEffect();
    const { attacker, defender, ctx, latest } = setup({ id: 1 });
    ctx.attackerAbilityName = 'たんじゅん';

    // Act
    await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(latest(1).defenseRank).toBe(2);
    expect(latest(1).volatileState.stockpileBoosts).toEqual({ defense: 1, specialDefense: 1 });
  });

  it('あまのじゃくで防御・特防が下がっても、1 回分として 1 を数える', async () => {
    // Arrange
    const effect = new StockpileEffect();
    const { attacker, defender, ctx, latest } = setup({ id: 1 });
    ctx.attackerAbilityName = 'あまのじゃく';

    // Act
    await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(latest(1).defenseRank).toBe(-1);
    expect(latest(1).volatileState.stockpileBoosts).toEqual({ defense: 1, specialDefense: 1 });
  });

  it('3 回たくわえていると失敗する', () => {
    // Arrange
    const effect = new StockpileEffect();
    const { attacker } = setup({ id: 1, volatileState: { stockpileCount: 3 } });

    // Act
    const failed = effect.shouldFail(attacker);

    // Assert
    expect(failed).toBe(true);
  });

  it('2 回たくわえているときは失敗しない', () => {
    // Arrange
    const effect = new StockpileEffect();
    const { attacker } = setup({ id: 1, volatileState: { stockpileCount: 2 } });

    // Act
    const failed = effect.shouldFail(attacker);

    // Assert
    expect(failed).toBe(false);
  });
});
