import { SpicySprayEffect } from './spicy-spray-effect';
import { AbilityRegistry } from '../../ability-registry';
import { HitResult } from '../../../battle-events/hit-result';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { MoveFlags } from '@/modules/pokemon/domain/moves/move-flags';

describe('SpicySprayEffect（とびだすハバネロ）', () => {
  const hit = (isContact: boolean, moveCategory: HitResult['moveCategory']): HitResult => ({
    damage: 30,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact,
    moveTypeName: 'ノーマル',
    moveCategory,
    targetFainted: false,
  });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('接触技のダメージを受けたら、攻撃した相手を必ずやけどにする', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { ability: 'とびだすハバネロ' });

    // Act
    const message = await new SpicySprayEffect().onDamagingHit(
      get(2),
      get(1),
      hit(true, 'Physical'),
      context({
        moveName: 'たいあたり',
        moveFlags: MoveFlags.get('たいあたり'),
        defenderAbilityName: 'とびだすハバネロ',
      }),
    );

    // Assert
    expect(get(1).statusCondition).toBe(StatusCondition.Burn);
    expect(message).toBe('とびだすハバネロ activated!');
  });

  it('接触しない技のダメージを受けても、攻撃した相手をやけどにする', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { ability: 'とびだすハバネロ' });

    // Act
    await new SpicySprayEffect().onDamagingHit(
      get(2),
      get(1),
      hit(false, 'Special'),
      context({
        moveName: 'みずでっぽう',
        moveFlags: MoveFlags.get('みずでっぽう'),
        defenderAbilityName: 'とびだすハバネロ',
      }),
    );

    // Assert
    expect(get(1).statusCondition).toBe(StatusCondition.Burn);
  });

  it('ほのおタイプの相手はやけどにしない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { types: ['ほのお'] },
      { ability: 'とびだすハバネロ' },
    );

    // Act
    const message = await new SpicySprayEffect().onDamagingHit(
      get(2),
      get(1),
      hit(false, 'Special'),
      context({
        moveName: 'みずでっぽう',
        moveFlags: MoveFlags.get('みずでっぽう'),
        defenderAbilityName: 'とびだすハバネロ',
      }),
    );

    // Assert
    expect(get(1).statusCondition).toBeNull();
    expect(message).toBeNull();
  });

  it('すでに状態異常の相手はやけどにしない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { status: { statusCondition: StatusCondition.Paralysis } },
      { ability: 'とびだすハバネロ' },
    );

    // Act
    await new SpicySprayEffect().onDamagingHit(
      get(2),
      get(1),
      hit(true, 'Physical'),
      context({
        moveName: 'たいあたり',
        moveFlags: MoveFlags.get('たいあたり'),
        defenderAbilityName: 'とびだすハバネロ',
      }),
    );

    // Assert
    expect(get(1).statusCondition).toBe(StatusCondition.Paralysis);
  });
});
