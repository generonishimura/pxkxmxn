import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { HitResult } from './hit-result';
import { AbilityRegistry } from '../abilities/ability-registry';
import { RoughSkinEffect } from '../abilities/effects/other/rough-skin-effect';
import { BadDreamsEffect } from '../abilities/effects/other/bad-dreams-effect';
import { DoubleEdgeEffect } from '../moves/effects/double-edge-effect';
import { HighJumpKickEffect } from '../moves/effects/high-jump-kick-effect';
import { StruggleEffect } from '../moves/effects/struggle-effect';
import { createInMemoryBattle } from './__tests__/in-memory-battle';

/**
 * 技以外のダメージを与えるすべての処理が、preventsIndirectDamage（マジックガード）を守るかを確かめる
 */
describe('技以外のダメージを受けない特性（preventsIndirectDamage）', () => {
  const createHit = (isContact: boolean): HitResult => ({
    damage: 10,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact,
    moveTypeName: 'ノーマル',
    moveCategory: 'Physical',
    targetFainted: false,
  });

  const GUARD = 'テストマジックガード';

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    AbilityRegistry.register(GUARD, { preventsIndirectDamage: true });
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('接触技を受けた相手のさめはだのダメージを受けない', async () => {
    // Arrange
    const { get, context } = createInMemoryBattle({ ability: GUARD });

    // Act
    const activated = await new RoughSkinEffect().onDamagingHit(
      get(2),
      get(1),
      createHit(true),
      context({ moveName: 'たいあたり', moveCategory: 'Physical' }),
    );

    // Assert
    expect(activated).toBeNull();
    expect(get(1).currentHp).toBe(100);
  });

  it('与えたダメージに応じた反動を受けない', async () => {
    // Arrange
    const { get, context } = createInMemoryBattle({ ability: GUARD });

    // Act
    const message = await new DoubleEdgeEffect().afterDamage(get(1), get(2), 60, context());

    // Assert
    expect(message).toBeNull();
    expect(get(1).currentHp).toBe(100);
  });

  it('外したときの自傷ダメージを受けない', async () => {
    // Arrange
    const { get, context } = createInMemoryBattle({ ability: GUARD });

    // Act
    const message = await new HighJumpKickEffect().onMiss(get(1), get(2), context());

    // Assert
    expect(message).toBeNull();
    expect(get(1).currentHp).toBe(100);
  });

  it('わるあがきの反動を受けない', async () => {
    // Arrange
    const { get, context } = createInMemoryBattle({ ability: GUARD });

    // Act
    const message = await new StruggleEffect().onHit(get(1), get(2), context());

    // Assert
    expect(message).toBeNull();
    expect(get(1).currentHp).toBe(100);
  });

  it('相手のナイトメアのダメージを受けない', async () => {
    // Arrange
    const { get, context } = createInMemoryBattle(
      { ability: 'ナイトメア' },
      { ability: GUARD, status: { statusCondition: StatusCondition.Sleep } },
    );

    // Act
    await new BadDreamsEffect().onTurnEnd(get(1), context());

    // Assert
    expect(get(2).currentHp).toBe(100);
  });
});
