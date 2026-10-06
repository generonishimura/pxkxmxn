import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoldBreakerEffect } from '@/modules/pokemon/domain/abilities/effects/mold-breaker-effect';
import { HitResult } from '@/modules/pokemon/domain/battle-events/hit-result';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { ATTACKER_ID, DEFENDER_ID, setupMoveExecutor } from './__tests__/move-executor-test-setup';

describe('MoveExecutorService - ヒットとひんしのイベント', () => {
  const twoHits = {
    beforeDamage: async (
      _a: BattlePokemonStatus,
      _d: BattlePokemonStatus,
      _m: unknown,
      ctx: { multiHitCount?: number },
    ) => {
      ctx.multiHitCount = 2;
    },
  };

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('防御側特性の onDamagingHit', () => {
    it('ダメージを受けたヒットごとに、ヒットの情報と攻撃側を渡して呼ばれる', async () => {
      // Arrange
      const onDamagingHit = jest.fn().mockResolvedValue(null);
      AbilityRegistry.register('テストじきゅうりょく', { onDamagingHit });
      const { execute } = setupMoveExecutor({
        defenderAbility: 'テストじきゅうりょく',
        damage: 30,
      });

      // Act
      await execute();

      // Assert
      expect(onDamagingHit).toHaveBeenCalledTimes(1);
      const [holder, attacker, hit] = onDamagingHit.mock.calls[0] as [
        BattlePokemonStatus,
        BattlePokemonStatus,
        HitResult,
      ];
      expect(holder.id).toBe(DEFENDER_ID);
      expect(holder.currentHp).toBe(70);
      expect(attacker.id).toBe(ATTACKER_ID);
      expect(hit).toEqual({
        damage: 30,
        hpBefore: 100,
        hitIndex: 0,
        hitCount: 1,
        isContact: true,
        moveTypeName: 'ノーマル',
        moveCategory: 'Physical',
        targetFainted: false,
      });
    });

    it('連続技ではヒットごとに呼ばれ、変えたランクを次のヒットのダメージ計算に使う', async () => {
      // Arrange
      AbilityRegistry.register('テストじきゅうりょく', {
        onDamagingHit: async (holder, _attacker, _hit, ctx) => {
          await ctx?.battleRepository?.updateBattlePokemonStatus(holder.id, {
            defenseRank: holder.defenseRank + 1,
          });
          return 'Defense rose!';
        },
      });
      const { execute, calculate } = setupMoveExecutor({
        defenderAbility: 'テストじきゅうりょく',
        moveEffect: twoHits,
      });

      // Act
      const message = await execute();

      // Assert
      expect(calculate).toHaveBeenCalledTimes(2);
      expect(calculate.mock.calls[1][0].defender.defenseRank).toBe(1);
      expect(message).toBe(
        'Used ほのおのパンチ and dealt 20 damage (hit 2 times) Defense rose! Defense rose!',
      );
    });

    it('ひんしになったヒットでも呼ばれ、targetFainted が true になる（とびだすなかみ用）', async () => {
      // Arrange
      const onDamagingHit = jest.fn().mockResolvedValue(null);
      AbilityRegistry.register('テストとびだすなかみ', { onDamagingHit });
      const { execute } = setupMoveExecutor({
        defenderAbility: 'テストとびだすなかみ',
        defender: { currentHp: 5 },
        damage: 30,
      });

      // Act
      await execute();

      // Assert
      const hit: HitResult = onDamagingHit.mock.calls[0][2];
      expect(hit.damage).toBe(5);
      expect(hit.targetFainted).toBe(true);
    });

    it('ダメージが0なら呼ばれない', async () => {
      // Arrange
      const onDamagingHit = jest.fn().mockResolvedValue(null);
      AbilityRegistry.register('テストじきゅうりょく', { onDamagingHit });
      const { execute } = setupMoveExecutor({ defenderAbility: 'テストじきゅうりょく', damage: 0 });

      // Act
      await execute();

      // Assert
      expect(onDamagingHit).not.toHaveBeenCalled();
    });

    it('攻撃側がかたやぶりでも呼ばれる', async () => {
      // Arrange
      const onDamagingHit = jest.fn().mockResolvedValue(null);
      AbilityRegistry.register('テストじきゅうりょく', { onDamagingHit });
      AbilityRegistry.register('テストかたやぶり', new MoldBreakerEffect());
      const { execute } = setupMoveExecutor({
        defenderAbility: 'テストじきゅうりょく',
        attackerAbility: 'テストかたやぶり',
      });

      // Act
      await execute();

      // Assert
      expect(onDamagingHit).toHaveBeenCalledTimes(1);
    });

    it('攻撃側がひんしになったら、残りのヒットをしない', async () => {
      // Arrange
      AbilityRegistry.register('テストてつのトゲ', {
        onDamagingHit: async (_holder, attacker, _hit, ctx) => {
          await ctx?.battleRepository?.updateBattlePokemonStatus(attacker.id, { currentHp: 0 });
          return null;
        },
      });
      const { execute, calculate } = setupMoveExecutor({
        defenderAbility: 'テストてつのトゲ',
        moveEffect: twoHits,
      });

      // Act
      await execute();

      // Assert
      expect(calculate).toHaveBeenCalledTimes(1);
    });
  });

  describe('接触したヒットごとに攻撃側へダメージを与える特性（さめはだ・てつのトゲ・ゆうばく）', () => {
    it.each(['さめはだ', 'てつのトゲ'])(
      '%s: 連続技の接触では、ヒットごとに攻撃側へ最大HPの1/8のダメージを与える',
      async abilityName => {
        // Arrange
        const { execute, statuses } = setupMoveExecutor({
          defenderAbility: abilityName,
          moveEffect: twoHits,
        });

        // Act
        const message = await execute();

        // Assert
        expect(statuses.get(ATTACKER_ID)?.currentHp).toBe(76);
        expect(message).toBe(
          `Used ほのおのパンチ and dealt 20 damage (hit 2 times) ${abilityName} activated! ${abilityName} activated!`,
        );
      },
    );

    it('さめはだのダメージで攻撃側がひんしになったら、残りのヒットをしない', async () => {
      // Arrange
      const { execute, calculate, statuses } = setupMoveExecutor({
        defenderAbility: 'さめはだ',
        attacker: { currentHp: 12 },
        moveEffect: twoHits,
      });

      // Act
      await execute();

      // Assert
      expect(calculate).toHaveBeenCalledTimes(1);
      expect(statuses.get(ATTACKER_ID)?.currentHp).toBe(0);
    });

    it('ゆうばく: 連続技の途中でひんしになったヒットで、攻撃側へ最大HPの1/4のダメージを1回だけ与える', async () => {
      // Arrange
      const { execute, statuses } = setupMoveExecutor({
        defenderAbility: 'ゆうばく',
        defender: { currentHp: 15 },
        moveEffect: twoHits,
      });

      // Act
      const message = await execute();

      // Assert
      expect(statuses.get(ATTACKER_ID)?.currentHp).toBe(75);
      expect(message).toBe(
        'Used ほのおのパンチ and dealt 15 damage (hit 2 times) ゆうばく activated!',
      );
    });
  });

  describe('攻撃側特性の onSourceDamagingHit', () => {
    it('ダメージを与えたヒットごとに、防御側とヒットの情報を渡して呼ばれる', async () => {
      // Arrange
      const onSourceDamagingHit = jest.fn().mockResolvedValue('was poisoned!');
      AbilityRegistry.register('テストどくしゅ', { onSourceDamagingHit });
      const { execute } = setupMoveExecutor({ attackerAbility: 'テストどくしゅ' });

      // Act
      const message = await execute();

      // Assert
      const [holder, target, hit] = onSourceDamagingHit.mock.calls[0] as [
        BattlePokemonStatus,
        BattlePokemonStatus,
        HitResult,
      ];
      expect(holder.id).toBe(ATTACKER_ID);
      expect(target.id).toBe(DEFENDER_ID);
      expect(target.currentHp).toBe(90);
      expect(hit.isContact).toBe(true);
      expect(message).toBe('Used ほのおのパンチ and dealt 10 damage was poisoned!');
    });

    it('防御側の onDamagingHit が変えた状態（わたげの素早さ低下など）を受け取る', async () => {
      // Arrange
      AbilityRegistry.register('テストわたげ', {
        onDamagingHit: async (holder, attacker, _hit, ctx) => {
          await ctx?.battleRepository?.updateBattlePokemonStatus(attacker.id, {
            speedRank: attacker.speedRank - 1,
          });
          await ctx?.battleRepository?.updateBattlePokemonStatus(holder.id, {
            defenseRank: holder.defenseRank + 1,
          });
          return null;
        },
      });
      const onSourceDamagingHit = jest.fn().mockResolvedValue(null);
      AbilityRegistry.register('テストどくしゅ', { onSourceDamagingHit });
      const { execute } = setupMoveExecutor({
        attackerAbility: 'テストどくしゅ',
        defenderAbility: 'テストわたげ',
      });

      // Act
      await execute();

      // Assert
      const [holder, target, , ctx] = onSourceDamagingHit.mock.calls[0] as [
        BattlePokemonStatus,
        BattlePokemonStatus,
        HitResult,
        { attacker?: BattlePokemonStatus; defender?: BattlePokemonStatus },
      ];
      expect(holder.speedRank).toBe(-1);
      expect(target.defenseRank).toBe(1);
      expect(ctx.attacker?.speedRank).toBe(-1);
      expect(ctx.defender?.defenseRank).toBe(1);
    });
  });

  describe('防御側特性の onAfterMoveHit', () => {
    it('技のすべてのヒットのあとに1回だけ、合計ダメージと技の前のHPを渡して呼ばれる', async () => {
      // Arrange
      const onAfterMoveHit = jest.fn().mockResolvedValue(null);
      AbilityRegistry.register('テストいかりのこうら', { onAfterMoveHit });
      const { execute } = setupMoveExecutor({
        defenderAbility: 'テストいかりのこうら',
        moveEffect: twoHits,
        damage: [30, 25],
      });

      // Act
      await execute();

      // Assert
      expect(onAfterMoveHit).toHaveBeenCalledTimes(1);
      const [holder, attacker, hit] = onAfterMoveHit.mock.calls[0] as [
        BattlePokemonStatus,
        BattlePokemonStatus,
        HitResult,
      ];
      expect(holder.currentHp).toBe(45);
      expect(attacker.id).toBe(ATTACKER_ID);
      expect(hit.damage).toBe(55);
      expect(hit.hpBefore).toBe(100);
      expect(hit.hitCount).toBe(2);
    });
  });

  describe('攻撃側特性の onKnockOut', () => {
    it('相手をひんしにしたとき、ひんしになった相手を渡して呼ばれる', async () => {
      // Arrange
      const onKnockOut = jest.fn().mockResolvedValue('Attack rose!');
      AbilityRegistry.register('テストじしんかじょう', { onKnockOut });
      const { execute } = setupMoveExecutor({
        attackerAbility: 'テストじしんかじょう',
        defender: { currentHp: 10 },
      });

      // Act
      const message = await execute();

      // Assert
      expect(onKnockOut).toHaveBeenCalledTimes(1);
      expect(onKnockOut.mock.calls[0][0].id).toBe(ATTACKER_ID);
      expect(onKnockOut.mock.calls[0][1].isFainted()).toBe(true);
      expect(message).toBe('Used ほのおのパンチ and dealt 10 damage Attack rose!');
    });

    it('相手がひんしにならなければ呼ばれない', async () => {
      // Arrange
      const onKnockOut = jest.fn().mockResolvedValue(null);
      AbilityRegistry.register('テストじしんかじょう', { onKnockOut });
      const { execute } = setupMoveExecutor({ attackerAbility: 'テストじしんかじょう' });

      // Act
      await execute();

      // Assert
      expect(onKnockOut).not.toHaveBeenCalled();
    });

    it('反動などで攻撃側もひんしになったら呼ばれない', async () => {
      // Arrange
      const onKnockOut = jest.fn().mockResolvedValue(null);
      AbilityRegistry.register('テストじしんかじょう', { onKnockOut });
      const { execute, battleRepository } = setupMoveExecutor({
        attackerAbility: 'テストじしんかじょう',
        defender: { currentHp: 10 },
        moveEffect: {
          afterDamage: async attacker => {
            await battleRepository.updateBattlePokemonStatus(attacker.id, { currentHp: 0 });
            return null;
          },
        },
      });

      // Act
      await execute();

      // Assert
      expect(onKnockOut).not.toHaveBeenCalled();
    });
  });
});
