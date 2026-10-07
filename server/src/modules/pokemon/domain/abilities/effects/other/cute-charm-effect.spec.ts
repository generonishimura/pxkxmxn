import { CuteCharmEffect } from './cute-charm-effect';
import { AbilityRegistry } from '../../ability-registry';
import { HitResult } from '../../../battle-events/hit-result';
import { Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import {
  InMemoryPokemon,
  createInMemoryBattle,
} from '../../../battle-events/__tests__/in-memory-battle';

describe('CuteCharmEffect（メロメロボディ）', () => {
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

  /** ID 1 が攻撃側（オス）、ID 2 がメロメロボディの持ち主（メス） */
  const setup = (attacker: InMemoryPokemon = {}) =>
    createInMemoryBattle(
      { gender: Gender.Male, ...attacker },
      { ability: 'メロメロボディ', gender: Gender.Female },
    );

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('接触技を受けたとき、30% の判定に当たると相手をメロメロにする', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.29);
    const { context, get } = setup();

    // Act
    const message = await new CuteCharmEffect().onDamagingHit(get(2), get(1), hit(), context());

    // Assert
    expect(get(1).volatileState.infatuatedWithStatusId).toBe(2);
    expect(message).toBe('メロメロボディ activated! fell in love!');
  });

  it('30% の判定に外れると、メロメロにしない', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.3);
    const { context, get } = setup();

    // Act
    const message = await new CuteCharmEffect().onDamagingHit(get(2), get(1), hit(), context());

    // Assert
    expect(get(1).volatileState.infatuatedWithStatusId).toBeUndefined();
    expect(message).toBeNull();
  });

  it('接触しない技では、メロメロにしない', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { context, get } = setup();

    // Act
    const message = await new CuteCharmEffect().onDamagingHit(
      get(2),
      get(1),
      hit({ isContact: false }),
      context(),
    );

    // Assert
    expect(get(1).volatileState.infatuatedWithStatusId).toBeUndefined();
    expect(message).toBeNull();
  });

  it.each([Gender.Female, Gender.Genderless])(
    '相手の性別が %s なら、メロメロにしない',
    async gender => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const { context, get } = setup({ gender });

      // Act
      const message = await new CuteCharmEffect().onDamagingHit(get(2), get(1), hit(), context());

      // Assert
      expect(get(1).volatileState.infatuatedWithStatusId).toBeUndefined();
      expect(message).toBeNull();
    },
  );

  it('相手がどんかんなら、メロメロにしない', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { context, get } = setup({ ability: 'どんかん' });

    // Act
    const message = await new CuteCharmEffect().onDamagingHit(get(2), get(1), hit(), context());

    // Assert
    expect(get(1).volatileState.infatuatedWithStatusId).toBeUndefined();
    expect(message).toBeNull();
  });

  it('AbilityRegistry に メロメロボディ として登録されている', () => {
    // Act
    const effect = AbilityRegistry.get('メロメロボディ');

    // Assert
    expect(effect).toBeInstanceOf(CuteCharmEffect);
  });
});
