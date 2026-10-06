import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import {
  InMemoryPokemon,
  createInMemoryBattle,
} from '@/modules/pokemon/domain/battle-events/__tests__/in-memory-battle';
import { Weather } from '../../domain/entities/battle.entity';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { StatusConditionHandler } from '../../domain/logic/status-condition-handler';
import { StatusConditionProcessorService } from './status-condition-processor.service';

/**
 * ターン終了時の一時的な状態による HP の増減と、遅れて効く効果
 * ID 1 がトレーナー1、ID 2 がトレーナー2 の場のポケモン（最大 HP 100）
 */
describe('StatusConditionProcessorService - ターン終了時の一時的な状態', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    jest.spyOn(StatusConditionHandler, 'shouldClearSleep').mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const runTurnEnd = async (
    first: InMemoryPokemon = {},
    second: InMemoryPokemon = {},
    setupBattle?: (repo: ReturnType<typeof createInMemoryBattle>['battleRepository']) => unknown,
  ) => {
    const memory = createInMemoryBattle(first, second);
    await setupBattle?.(memory.battleRepository);
    const processor = new StatusConditionProcessorService(
      memory.battleRepository,
      memory.trainedPokemonRepository,
    );
    await processor.processTurnEndAbilities(await memory.battleRepository.findById(1));
    return memory;
  };

  describe('すなあらし', () => {
    const sandstorm = (repo: ReturnType<typeof createInMemoryBattle>['battleRepository']) =>
      repo.update(1, { weather: Weather.Sandstorm });

    it('いわ・じめん・はがねタイプでなければ、最大 HP の 1/16 のダメージを受ける', async () => {
      // Act
      const { get } = await runTurnEnd({}, { types: ['いわ'] }, sandstorm);

      // Assert
      expect(get(1).currentHp).toBe(94);
      expect(get(2).currentHp).toBe(100);
    });

    it.each(['すながくれ', 'すなかき', 'すなのちから', 'ぼうじん', 'マジックガード'])(
      '%s ならダメージを受けない',
      async abilityName => {
        // Act
        const { get } = await runTurnEnd({ ability: abilityName }, {}, sandstorm);

        // Assert
        expect(get(1).currentHp).toBe(100);
      },
    );

    it('ノーてんきが場にいれば、ダメージはない', async () => {
      // Act
      const { get } = await runTurnEnd({}, { ability: 'ノーてんき' }, sandstorm);

      // Assert
      expect(get(1).currentHp).toBe(100);
    });
  });

  describe('ねがいごと', () => {
    it('残りターン数が 1 なら、その陣営の場のポケモンを healAmount だけ回復する', async () => {
      // Act
      const { get } = await runTurnEnd({ status: { currentHp: 40 } }, {}, repo =>
        repo.patchSideConditions(1, 1, { wish: { turns: 1, healAmount: 50 } }),
      );

      // Assert
      expect(get(1).currentHp).toBe(90);
    });

    it('残りターン数が 1 でなければ、まだ回復しない', async () => {
      // Act
      const { get } = await runTurnEnd({ status: { currentHp: 40 } }, {}, repo =>
        repo.patchSideConditions(1, 1, { wish: { turns: 2, healAmount: 50 } }),
      );

      // Assert
      expect(get(1).currentHp).toBe(40);
    });

    it('かいふくふうじ中なら回復しない', async () => {
      // Act
      const { get } = await runTurnEnd(
        { status: { currentHp: 40, volatileState: { healBlockTurns: 2 } } },
        {},
        repo => repo.patchSideConditions(1, 1, { wish: { turns: 1, healAmount: 50 } }),
      );

      // Assert
      expect(get(1).currentHp).toBe(40);
    });
  });

  describe('回復する状態', () => {
    it.each([[{ aquaRing: true }], [{ ingrain: true }]])(
      '%j なら、最大 HP の 1/16 を回復する',
      async volatileState => {
        // Act
        const { get } = await runTurnEnd({ status: { currentHp: 50, volatileState } });

        // Assert
        expect(get(1).currentHp).toBe(56);
      },
    );

    it('かいふくふうじ中は、アクアリングでも回復しない', async () => {
      // Act
      const { get } = await runTurnEnd({
        status: { currentHp: 50, volatileState: { aquaRing: true, healBlockTurns: 2 } },
      });

      // Assert
      expect(get(1).currentHp).toBe(50);
    });
  });

  describe('やどりぎのタネ', () => {
    it('植えられたポケモンは最大 HP の 1/8 を吸われ、相手がその分だけ回復する', async () => {
      // Act
      const { get } = await runTurnEnd(
        { status: { currentHp: 50 } },
        { status: { volatileState: { leechSeed: true } } },
      );

      // Assert
      expect(get(2).currentHp).toBe(88);
      expect(get(1).currentHp).toBe(62);
    });

    it('植えられたポケモンがマジックガードなら、吸われず相手も回復しない', async () => {
      // Act
      const { get } = await runTurnEnd(
        { status: { currentHp: 50 } },
        { ability: 'マジックガード', status: { volatileState: { leechSeed: true } } },
      );

      // Assert
      expect(get(2).currentHp).toBe(100);
      expect(get(1).currentHp).toBe(50);
    });

    it('植えられたポケモンがヘドロえきなら、相手は回復せずにダメージを受ける', async () => {
      // Act
      const { get } = await runTurnEnd(
        { status: { currentHp: 50 } },
        { ability: 'ヘドロえき', status: { volatileState: { leechSeed: true } } },
      );

      // Assert
      expect(get(2).currentHp).toBe(88);
      expect(get(1).currentHp).toBe(38);
    });
  });

  describe('ダメージを受ける状態', () => {
    it('あくむは、ねむっていれば最大 HP の 1/4 のダメージ', async () => {
      // Act
      const { get } = await runTurnEnd({
        status: { statusCondition: StatusCondition.Sleep, volatileState: { nightmare: true } },
      });

      // Assert
      expect(get(1).currentHp).toBe(75);
    });

    it('あくむは、目を覚ましていれば消えてダメージもない', async () => {
      // Act
      const { get } = await runTurnEnd({ status: { volatileState: { nightmare: true } } });

      // Assert
      expect(get(1).currentHp).toBe(100);
      expect(get(1).volatileState.nightmare).toBeUndefined();
    });

    it('のろいは最大 HP の 1/4 のダメージ', async () => {
      // Act
      const { get } = await runTurnEnd({ status: { volatileState: { cursed: true } } });

      // Assert
      expect(get(1).currentHp).toBe(75);
    });

    it('バインド状態は最大 HP の 1/8 のダメージを受け、残りターン数を 1 減らす', async () => {
      // Act
      const { get } = await runTurnEnd({
        status: { volatileState: { partialTrap: { sourceStatusId: 2, moveId: 9, turns: 3 } } },
      });

      // Assert
      expect(get(1).currentHp).toBe(88);
      expect(get(1).volatileState.partialTrap).toEqual({ sourceStatusId: 2, moveId: 9, turns: 2 });
    });

    it('バインド状態は、残りターン数が 0 になるとダメージを受けずに解ける', async () => {
      // Act
      const { get } = await runTurnEnd({
        status: { volatileState: { partialTrap: { sourceStatusId: 2, moveId: 9, turns: 1 } } },
      });

      // Assert
      expect(get(1).currentHp).toBe(100);
      expect(get(1).volatileState.partialTrap).toBeUndefined();
    });

    it('しめつけたポケモンがひんしなら、バインド状態はダメージを与えずに解ける', async () => {
      // Act
      const { get } = await runTurnEnd(
        { status: { volatileState: { partialTrap: { sourceStatusId: 2, moveId: 9, turns: 3 } } } },
        { status: { currentHp: 0 } },
      );

      // Assert
      expect(get(1).currentHp).toBe(100);
      expect(get(1).volatileState.partialTrap).toBeUndefined();
    });

    it('しめつけたポケモンが場にいなければ、バインド状態はダメージを与えずに解ける', async () => {
      // Act
      const { get } = await runTurnEnd(
        { status: { volatileState: { partialTrap: { sourceStatusId: 2, moveId: 9, turns: 3 } } } },
        { status: { isActive: false } },
      );

      // Assert
      expect(get(1).currentHp).toBe(100);
      expect(get(1).volatileState.partialTrap).toBeUndefined();
    });

    it('しおづけは最大 HP の 1/8、みず・はがねタイプには 1/4 のダメージ', async () => {
      // Act
      const { get } = await runTurnEnd(
        { status: { volatileState: { saltCure: true } } },
        { types: ['みず'], status: { volatileState: { saltCure: true } } },
      );

      // Assert
      expect(get(1).currentHp).toBe(88);
      expect(get(2).currentHp).toBe(75);
    });

    it.each([
      [{ cursed: true }],
      [{ saltCure: true }],
      [{ partialTrap: { sourceStatusId: 2, moveId: 9, turns: 3 } }],
    ])('マジックガードなら、%j のダメージを受けない', async volatileState => {
      // Act
      const { get } = await runTurnEnd({ ability: 'マジックガード', status: { volatileState } });

      // Assert
      expect(get(1).currentHp).toBe(100);
    });
  });

  describe('たこがため', () => {
    it('たこがためをかけられていると、防御と特防が 1 段階ずつ下がる', async () => {
      // Act
      const { get } = await runTurnEnd(
        {},
        { status: { volatileState: { trappedByStatusId: 1, octolock: true } } },
      );

      // Assert
      expect(get(2).defenseRank).toBe(-1);
      expect(get(2).specialDefenseRank).toBe(-1);
    });

    it('たこがためをかけたポケモンがひんしなら、ランクは下がらずに解ける', async () => {
      // Act
      const { get } = await runTurnEnd(
        { status: { currentHp: 0 } },
        { status: { volatileState: { trappedByStatusId: 1, octolock: true } } },
      );

      // Assert
      expect(get(2).defenseRank).toBe(0);
      expect(get(2).volatileState.octolock).toBeUndefined();
      expect(get(2).volatileState.trappedByStatusId).toBeUndefined();
    });
  });

  describe('遅れて効く効果', () => {
    it('あくびの残りターン数が 1 なら、ねむりになる', async () => {
      // Act
      const { get } = await runTurnEnd({ status: { volatileState: { yawnTurns: 1 } } });

      // Assert
      expect(get(1).statusCondition).toBe(StatusCondition.Sleep);
    });

    it('あくびの残りターン数が 2 なら、まだねむらない', async () => {
      // Act
      const { get } = await runTurnEnd({ status: { volatileState: { yawnTurns: 2 } } });

      // Assert
      expect(get(1).statusCondition).toBeNull();
    });

    it('ほろびのカウントが 0 なら、ひんしになる', async () => {
      // Act
      const { get } = await runTurnEnd({ status: { volatileState: { perishCount: 0 } } });

      // Assert
      expect(get(1).currentHp).toBe(0);
    });

    it('ほろびのカウントが 1 以上なら、1 減らす', async () => {
      // Act
      const { get } = await runTurnEnd({ status: { volatileState: { perishCount: 3 } } });

      // Assert
      expect(get(1).volatileState.perishCount).toBe(2);
      expect(get(1).currentHp).toBe(100);
    });

    it('マジックガードでも、ほろびのうたではひんしになる', async () => {
      // Act
      const { get } = await runTurnEnd({
        ability: 'マジックガード',
        status: { volatileState: { perishCount: 0 } },
      });

      // Assert
      expect(get(1).currentHp).toBe(0);
    });
  });
});
