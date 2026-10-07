import { BattleBondEffect } from './battle-bond-effect';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';

describe('BattleBondEffect（きずなへんげ）', () => {
  const GRENINJA = 658;

  /**
   * 相手（トレーナー2）の控えに、ひんしでないポケモンを 1 匹置いたバトルを作る
   */
  const setupWithFoeBench = (first: Parameters<typeof createInMemoryBattle>[0]) => {
    const battle = createInMemoryBattle(first, { status: { currentHp: 0 } });
    battle.statuses.set(
      3,
      new BattlePokemonStatus(3, 1, 3, 2, false, 100, 100, 0, 0, 0, 0, 0, 0, 0, null),
    );
    return battle;
  };

  describe('onKnockOut', () => {
    it('相手をひんしにしたら、攻撃・特攻・素早さを1段階ずつ上げる', async () => {
      // Arrange
      const { context, get } = setupWithFoeBench({
        ability: 'きずなへんげ',
        nationalDex: GRENINJA,
      });

      // Act
      const message = await new BattleBondEffect().onKnockOut(get(1), get(2), context());

      // Assert
      expect([get(1).attackRank, get(1).specialAttackRank, get(1).speedRank]).toEqual([1, 1, 1]);
      expect(get(1).persistentState.oncePerBattleAbilityUsed).toBe(true);
      expect(message).toContain('Attack rose!');
    });

    it('一度発動したら、交代してもそのバトルではもう発動しない', async () => {
      // Arrange
      const { context, get } = setupWithFoeBench({
        ability: 'きずなへんげ',
        nationalDex: GRENINJA,
        status: { persistentState: { oncePerBattleAbilityUsed: true } },
      });

      // Act
      const message = await new BattleBondEffect().onKnockOut(get(1), get(2), context());

      // Assert
      expect(message).toBeNull();
      expect(get(1).attackRank).toBe(0);
    });

    it('相手に残りのポケモンがいなければ、発動しない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'きずなへんげ', nationalDex: GRENINJA },
        { status: { currentHp: 0 } },
      );

      // Act
      const message = await new BattleBondEffect().onKnockOut(get(1), get(2), context());

      // Assert
      expect(message).toBeNull();
      expect(get(1).persistentState.oncePerBattleAbilityUsed).toBeUndefined();
    });

    it('へんしん中・ゲッコウガでないときは、発動しない', async () => {
      // Arrange
      const transformed = setupWithFoeBench({
        ability: 'きずなへんげ',
        nationalDex: GRENINJA,
        status: { volatileState: { transformedIntoStatusId: 2 } },
      });
      const other = setupWithFoeBench({ ability: 'きずなへんげ', nationalDex: 25 });

      // Act
      const results = [
        await new BattleBondEffect().onKnockOut(
          transformed.get(1),
          transformed.get(2),
          transformed.context(),
        ),
        await new BattleBondEffect().onKnockOut(other.get(1), other.get(2), other.context()),
      ];

      // Assert
      expect(results).toEqual([null, null]);
    });
  });
});
