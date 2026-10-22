import { PoisonTouchEffect } from './poison-touch-effect';
import { AbilityRegistry } from '../../ability-registry';
import { HitResult } from '../../../battle-events/hit-result';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import {
  InMemoryPokemon,
  createInMemoryBattle,
} from '../../../battle-events/__tests__/in-memory-battle';

describe('PoisonTouchEffect（どくしゅ）', () => {
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

  const setup = (target: InMemoryPokemon = {}) =>
    createInMemoryBattle({ ability: 'どくしゅ' }, { status: { currentHp: 70 }, ...target });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('接触技で、30%の判定に当たると相手をどくにする', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.29);
    const { context, get } = setup();

    // Act
    const message = await new PoisonTouchEffect().onSourceDamagingHit(
      get(1),
      get(2),
      hit(),
      context(),
    );

    // Assert
    expect(get(2).statusCondition).toBe(StatusCondition.Poison);
    expect(message).toBe('どくしゅ activated!');
  });

  it('30%の判定に外れると、どくにしない', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.3);
    const { context, get } = setup();

    // Act
    const message = await new PoisonTouchEffect().onSourceDamagingHit(
      get(1),
      get(2),
      hit(),
      context(),
    );

    // Assert
    expect(get(2).statusCondition).toBeNull();
    expect(message).toBeNull();
  });

  it('接触しない技では、どくにしない', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { context, get } = setup();

    // Act
    const message = await new PoisonTouchEffect().onSourceDamagingHit(
      get(1),
      get(2),
      hit({ isContact: false }),
      context(),
    );

    // Assert
    expect(get(2).statusCondition).toBeNull();
    expect(message).toBeNull();
  });

  it('相手への追加効果が無効（りんぷん）なら、どくにしない', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { context, get } = setup();

    // Act
    const message = await new PoisonTouchEffect().onSourceDamagingHit(
      get(1),
      get(2),
      hit(),
      context({ secondaryEffectsSuppressed: true }),
    );

    // Assert
    expect(get(2).statusCondition).toBeNull();
    expect(message).toBeNull();
  });

  it('てんのめぐみの倍率は掛からない', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const { context, get } = setup();

    // Act
    const message = await new PoisonTouchEffect().onSourceDamagingHit(
      get(1),
      get(2),
      hit(),
      context({ secondaryEffectChanceMultiplier: 2 }),
    );

    // Assert
    expect(get(2).statusCondition).toBeNull();
    expect(message).toBeNull();
  });

  it.each([['どく'], ['はがね']])('%sタイプの相手は、どくにならない', async typeName => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { context, get } = setup({ types: [typeName] });

    // Act
    const message = await new PoisonTouchEffect().onSourceDamagingHit(
      get(1),
      get(2),
      hit(),
      context(),
    );

    // Assert
    expect(get(2).statusCondition).toBeNull();
    expect(message).toBeNull();
  });

  it('すでに状態異常の相手は、どくにならない', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { context, get } = setup({
      status: { currentHp: 70, statusCondition: StatusCondition.Paralysis },
    });

    // Act
    const message = await new PoisonTouchEffect().onSourceDamagingHit(
      get(1),
      get(2),
      hit(),
      context(),
    );

    // Assert
    expect(get(2).statusCondition).toBe(StatusCondition.Paralysis);
    expect(message).toBeNull();
  });

  it('ひんしになった相手は、どくにならない', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { context, get } = setup({ status: { currentHp: 0 } });

    // Act
    const message = await new PoisonTouchEffect().onSourceDamagingHit(
      get(1),
      get(2),
      hit({ targetFainted: true }),
      context(),
    );

    // Assert
    expect(get(2).statusCondition).toBeNull();
    expect(message).toBeNull();
  });
});
