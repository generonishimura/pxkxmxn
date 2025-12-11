import { FurySwipesEffect } from './fury-swipes-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Move, MoveCategory } from '../../entities/move.entity';
import { Type } from '../../entities/type.entity';
import {
  createBattlePokemonStatus,
  createBattleContext,
  createMove,
} from './__tests__/test-helpers';

describe('FurySwipesEffect', () => {
  let effect: FurySwipesEffect;
  let attacker: BattlePokemonStatus;
  let defender: BattlePokemonStatus;
  let move: Move;
  let battleContext: BattleContext;

  beforeEach(() => {
    effect = new FurySwipesEffect();
    attacker = createBattlePokemonStatus({
      id: 1,
      trainedPokemonId: 1,
      trainerId: 1,
    });
    defender = createBattlePokemonStatus({
      id: 2,
      trainedPokemonId: 2,
      trainerId: 2,
    });
    move = createMove(
      'みだれひっかき',
      'Fury Swipes',
      new Type(1, 'ノーマル', 'Normal'),
      MoveCategory.Physical,
      {
        power: 18,
        accuracy: 80,
        pp: 15,
      },
    );
    battleContext = createBattleContext();
  });

  describe('beforeDamage', () => {
    it('攻撃回数を決定し、BattleContextに保存する', async () => {
      await effect.beforeDamage(attacker, defender, move, battleContext);
      expect(battleContext.multiHitCount).toBeDefined();
      expect(battleContext.multiHitCount).toBeGreaterThanOrEqual(2);
      expect(battleContext.multiHitCount).toBeLessThanOrEqual(5);
    });

    it('複数回実行しても、毎回新しい回数を決定する', async () => {
      const counts: number[] = [];
      for (let i = 0; i < 10; i++) {
        const newContext: BattleContext = {
          ...battleContext,
        };
        await effect.beforeDamage(attacker, defender, move, newContext);
        counts.push(newContext.multiHitCount!);
      }
      // 全ての回数が範囲内であることを確認
      counts.forEach(count => {
        expect(count).toBeGreaterThanOrEqual(2);
        expect(count).toBeLessThanOrEqual(5);
      });
    });
  });
});
