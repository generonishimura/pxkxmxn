import { FurySwipesEffect } from './fury-swipes-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Move, MoveCategory } from '../../entities/move.entity';
import { Type } from '../../entities/type.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('FurySwipesEffect', () => {
  let effect: FurySwipesEffect;
  let attacker: BattlePokemonStatus;
  let defender: BattlePokemonStatus;
  let move: Move;
  let battleContext: BattleContext;

  beforeEach(() => {
    effect = new FurySwipesEffect();
    attacker = {
      id: 1,
      battleId: 1,
      trainedPokemonId: 1,
      trainerId: 1,
      isActive: true,
      currentHp: 100,
      maxHp: 100,
      attackRank: 0,
      defenseRank: 0,
      specialAttackRank: 0,
      specialDefenseRank: 0,
      speedRank: 0,
      accuracyRank: 0,
      evasionRank: 0,
      statusCondition: null,
    } as BattlePokemonStatus;

    defender = {
      id: 2,
      battleId: 1,
      trainedPokemonId: 2,
      trainerId: 2,
      isActive: true,
      currentHp: 100,
      maxHp: 100,
      attackRank: 0,
      defenseRank: 0,
      specialAttackRank: 0,
      specialDefenseRank: 0,
      speedRank: 0,
      accuracyRank: 0,
      evasionRank: 0,
      statusCondition: null,
    } as BattlePokemonStatus;

    move = {
      id: 1,
      name: 'みだれひっかき',
      nameEn: 'Fury Swipes',
      type: new Type(1, 'ノーマル', 'Normal'),
      category: MoveCategory.Physical,
      power: 18,
      accuracy: 80,
      pp: 15,
      priority: 0,
      description: null,
    } as Move;

    battleContext = {
      battle: {
        id: 1,
        trainer1Id: 1,
        trainer2Id: 2,
        team1Id: 1,
        team2Id: 2,
        turn: 1,
        weather: null,
        field: null,
        status: BattleStatus.Active,
        winnerTrainerId: null,
      },
    };
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
