import { AbilityRegistry } from '../abilities/ability-registry';
import { IntimidateEffect } from '../abilities/effects/stat-change/intimidate-effect';
import { IntrepidSwordEffect } from '../abilities/effects/stat-change/intrepid-sword-effect';
import { GooeyEffect } from '../abilities/effects/stat-change/gooey-effect';
import { PsychicEffect } from '../moves/effects/psychic-effect';
import { SandAttackEffect } from '../moves/effects/sand-attack-effect';
import { NastyPlotEffect } from '../moves/effects/nasty-plot-effect';
import { DragonDanceEffect } from '../moves/effects/dragon-dance-effect';
import { TearfulLookEffect } from '../moves/effects/tearful-look-effect';
import { TickleEffect } from '../moves/effects/tickle-effect';
import { AncientPowerEffect } from '../moves/effects/ancient-power-effect';
import { EffectSource } from './effect-source';
import { StatChange } from './stat-change';
import { createInMemoryBattle } from './__tests__/in-memory-battle';

/**
 * 能力ランクを変える基底クラスが applyStatChanges を使い、変化を起こしたものを渡すかを確かめる
 * あまのじゃく（変化を逆にする）のテスト用の特性で確かめる
 */
describe('能力ランクを変える効果と、変化のフック', () => {
  const CONTRARY = 'テストあまのじゃく';
  const sources: Array<EffectSource | undefined> = [];

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    sources.length = 0;
    AbilityRegistry.register(CONTRARY, {
      modifyIncomingStatChange: (_holder, change: StatChange, source) => {
        sources.push(source);
        return -change.rankChange;
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('技の追加効果で相手のランクを下げる技（サイコキネシス）', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { context, get } = createInMemoryBattle({}, { ability: CONTRARY });

    // Act
    const message = await new PsychicEffect().onHit(
      get(1),
      get(2),
      context({ moveName: 'サイコキネシス' }),
    );

    // Assert
    expect(get(2).specialDefenseRank).toBe(1);
    expect(message).toBe('Special Defense rose!');
    expect(sources[0]).toEqual(
      expect.objectContaining({ kind: 'move', name: 'サイコキネシス', pokemon: get(1) }),
    );
  });

  it('相手のランクを下げる変化技（すなかけ）', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { ability: CONTRARY });

    // Act
    const message = await new SandAttackEffect().onUse(get(1), get(2), context());

    // Assert
    expect(get(2).accuracyRank).toBe(1);
    expect(message).toBe('Accuracy rose!');
  });

  it('自分のランクを上げる変化技（わるだくみ）', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ ability: CONTRARY });

    // Act
    const message = await new NastyPlotEffect().onUse(get(1), get(2), context());

    // Assert
    expect(get(1).specialAttackRank).toBe(-2);
    expect(message).toBe('Special Attack fell!');
    expect(sources[0]?.pokemon?.id).toBe(1);
  });

  it('自分の複数のランクを上げる変化技（りゅうのまい）', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ ability: CONTRARY });

    // Act
    const message = await new DragonDanceEffect().onUse(get(1), get(2), context());

    // Assert
    expect(get(1).attackRank).toBe(-1);
    expect(get(1).speedRank).toBe(-1);
    expect(message).toBe('Attack fell! Speed fell!');
  });

  it('相手の複数のランクを下げる変化技（なみだめ）', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { ability: CONTRARY });

    // Act
    await new TearfulLookEffect().onUse(get(1), get(2), context());

    // Assert
    expect(get(2).attackRank).toBe(1);
    expect(get(2).specialAttackRank).toBe(1);
  });

  it('追加効果で自分の全能力を上げる技（げんしのちから）', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { context, get } = createInMemoryBattle({ ability: CONTRARY });

    // Act
    await new AncientPowerEffect().onHit(get(1), get(2), context());

    // Assert
    expect(get(1).attackRank).toBe(-1);
    expect(get(1).speedRank).toBe(-1);
  });

  it('場に出たときに相手のランクを下げる特性（いかく）は、特性名と持ち主を原因として渡す', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ ability: 'いかく' }, { ability: CONTRARY });

    // Act
    await new IntimidateEffect().onEntry(get(1), context());

    // Assert
    expect(get(2).attackRank).toBe(1);
    expect(sources[0]).toEqual(
      expect.objectContaining({ kind: 'ability', name: 'いかく', pokemon: get(1) }),
    );
  });

  it('場に出たときに自分のランクを上げる特性（ふとうのつるぎ）', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ ability: CONTRARY });

    // Act
    await new IntrepidSwordEffect().onEntry(get(1), context());

    // Assert
    expect(get(1).attackRank).toBe(-1);
  });

  describe('能力の低下を防ぐ特性（しろいけむり・かいりきバサミ）は、相手のランクを下げるどの経路でも効く', () => {
    it('技の追加効果（サイコキネシス）の特防の低下を、しろいけむりで防ぐ', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const { context, get } = createInMemoryBattle({}, { ability: 'しろいけむり' });

      // Act
      await new PsychicEffect().onHit(get(1), get(2), context({ moveName: 'サイコキネシス' }));

      // Assert
      expect(get(2).specialDefenseRank).toBe(0);
    });

    it('くすぐるは、かいりきバサミの相手の攻撃だけ下げられず、防御は下げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { ability: 'かいりきバサミ' });

      // Act
      await new TickleEffect().onUse(get(1), get(2), context());

      // Assert
      expect(get(2).attackRank).toBe(0);
      expect(get(2).defenseRank).toBe(-1);
    });

    it('なみだめは、かいりきバサミの相手の攻撃だけ下げられず、特攻は下げる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { ability: 'かいりきバサミ' });

      // Act
      await new TearfulLookEffect().onUse(get(1), get(2), context());

      // Assert
      expect(get(2).attackRank).toBe(0);
      expect(get(2).specialAttackRank).toBe(-1);
    });
  });

  it('接触技を受けたときに相手のランクを下げる特性（ぬめぬめ）', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ ability: CONTRARY }, { ability: 'ぬめぬめ' });

    // Act
    const activated = await new GooeyEffect().applyContactStatusCondition(
      get(2),
      get(1),
      context({
        moveName: 'たいあたり',
        moveCategory: 'Physical',
        defender: get(2),
        defenderAbilityName: 'ぬめぬめ',
      }),
    );

    // Assert
    expect(activated).toBe(true);
    expect(get(1).speedRank).toBe(1);
    expect(sources[0]).toEqual(
      expect.objectContaining({ kind: 'ability', name: 'ぬめぬめ', pokemon: get(2) }),
    );
  });
});
