import { CursedBodyEffect } from './cursed-body-effect';
import { AbilityRegistry } from '../../ability-registry';
import { HitResult } from '../../../battle-events/hit-result';
import { BattlePokemonMove } from '@/modules/battle/domain/entities/battle-pokemon-move.entity';
import { BattleContext } from '../../battle-context.interface';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('CursedBodyEffect（のろわれボディ）', () => {
  const TACKLE_ID = 33;

  const hit = (data: Partial<HitResult> = {}): HitResult => ({
    damage: 30,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact: true,
    moveTypeName: 'ノーマル',
    moveCategory: 'Physical',
    targetFainted: false,
    ...data,
  });

  /** ID 1 が攻撃側（たいあたりを出した）、ID 2 がのろわれボディの持ち主 */
  const setup = (volatileState: VolatileState = { lastMoveId: TACKLE_ID }, currentPp = 10) => {
    const battle = createInMemoryBattle(
      { status: { volatileState } },
      { ability: 'のろわれボディ' },
    );
    battle.battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
      new BattlePokemonMove(1, 1, TACKLE_ID, currentPp, 35),
    ]);
    return battle;
  };

  const trigger = (
    { context, get }: ReturnType<typeof setup>,
    data: Partial<BattleContext> = { moveName: 'たいあたり', moveId: TACKLE_ID },
  ) => new CursedBodyEffect().onDamagingHit(get(2), get(1), hit(), context(data));

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('技を受けたとき、30% の判定に当たると相手のその技を 4 ターンかなしばりにする', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.29);
    const battle = setup();

    // Act
    const message = await trigger(battle);

    // Assert
    expect(battle.get(1).volatileState.disable).toEqual({ moveId: TACKLE_ID, turns: 4 });
    expect(message).toBe('のろわれボディ activated! was disabled!');
  });

  it('30% の判定に外れると、かなしばりにしない', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.3);
    const battle = setup();

    // Act
    const message = await trigger(battle);

    // Assert
    expect(battle.get(1).volatileState.disable).toBeUndefined();
    expect(message).toBeNull();
  });

  it('おどりこで出した技なら、5 ターンかなしばりにする', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const battle = setup();

    // Act
    await trigger(battle, { moveName: 'たいあたり', moveId: TACKLE_ID, calledBy: 'おどりこ' });

    // Assert
    expect(battle.get(1).volatileState.disable).toEqual({ moveId: TACKLE_ID, turns: 5 });
  });

  it('相手がすでにかなしばりを受けていれば、何もしない', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const battle = setup({ lastMoveId: TACKLE_ID, disable: { moveId: 1, turns: 2 } });

    // Act
    const message = await trigger(battle);

    // Assert
    expect(battle.get(1).volatileState.disable).toEqual({ moveId: 1, turns: 2 });
    expect(message).toBeNull();
  });

  it('相手の最後に出した技の PP が 0 なら、かなしばりにしない', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const battle = setup({ lastMoveId: TACKLE_ID }, 0);

    // Act
    const message = await trigger(battle);

    // Assert
    expect(battle.get(1).volatileState.disable).toBeUndefined();
    expect(message).toBeNull();
  });

  it('相手が最後に出した技がなければ、かなしばりにしない', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const battle = setup({});

    // Act
    const message = await trigger(battle);

    // Assert
    expect(battle.get(1).volatileState.disable).toBeUndefined();
    expect(message).toBeNull();
  });

  it.each(['わるあがき', 'みらいよち'])('%s では、かなしばりにしない', async moveName => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const battle = setup();

    // Act
    const message = await trigger(battle, { moveName, moveId: TACKLE_ID });

    // Assert
    expect(battle.get(1).volatileState.disable).toBeUndefined();
    expect(message).toBeNull();
  });

  it('AbilityRegistry に のろわれボディ として登録されている', () => {
    // Act
    const effect = AbilityRegistry.get('のろわれボディ');

    // Assert
    expect(effect).toBeInstanceOf(CursedBodyEffect);
  });
});
