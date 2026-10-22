import { GulpMissileEffect } from './gulp-missile-effect';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { HitResult } from '../../../battle-events/hit-result';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

describe('GulpMissileEffect（うのミサイル）', () => {
  const CRAMORANT = 845;

  const createHit = (): HitResult => ({
    damage: 30,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact: false,
    moveTypeName: 'みず',
    moveCategory: 'Special',
    targetFainted: false,
  });

  describe('onSourceDamagingHit', () => {
    it('なみのりを当てたとき、HPが半分より多ければ、うのみのすがたになる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'うのミサイル', nationalDex: CRAMORANT, status: { currentHp: 51, maxHp: 100 } },
        {},
      );

      // Act
      await new GulpMissileEffect().onSourceDamagingHit(
        get(1),
        get(2),
        createHit(),
        context({ moveName: 'なみのり' }),
      );

      // Assert
      expect(get(1).volatileState.form).toBe('gulping');
    });

    it('なみのりを当てたとき、HPが半分以下なら、まるのみのすがたになる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'うのミサイル', nationalDex: CRAMORANT, status: { currentHp: 50, maxHp: 100 } },
        {},
      );

      // Act
      await new GulpMissileEffect().onSourceDamagingHit(
        get(1),
        get(2),
        createHit(),
        context({ moveName: 'なみのり' }),
      );

      // Assert
      expect(get(1).volatileState.form).toBe('gorging');
    });

    it('なみのり以外の技では、フォルムを変えない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'うのミサイル', nationalDex: CRAMORANT },
        {},
      );

      // Act
      await new GulpMissileEffect().onSourceDamagingHit(
        get(1),
        get(2),
        createHit(),
        context({ moveName: 'ハイドロポンプ' }),
      );

      // Assert
      expect(get(1).volatileState.form).toBeUndefined();
    });

    it('すでにエサをくわえているときは、フォルムを変えない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {
          ability: 'うのミサイル',
          nationalDex: CRAMORANT,
          status: { currentHp: 10, maxHp: 100, volatileState: { form: 'gulping' } },
        },
        {},
      );

      // Act
      await new GulpMissileEffect().onSourceDamagingHit(
        get(1),
        get(2),
        createHit(),
        context({ moveName: 'なみのり' }),
      );

      // Assert
      expect(get(1).volatileState.form).toBe('gulping');
    });

    it('ウッウでなければ、フォルムを変えない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'うのミサイル', nationalDex: 25 },
        {},
      );

      // Act
      await new GulpMissileEffect().onSourceDamagingHit(
        get(1),
        get(2),
        createHit(),
        context({ moveName: 'なみのり' }),
      );

      // Assert
      expect(get(1).volatileState.form).toBeUndefined();
    });
  });

  describe('onDamagingHit', () => {
    it('うのみのすがたで攻撃を受けたら、相手に最大HPの1/4のダメージと防御-1を与え、もとのすがたに戻る', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {
          ability: 'うのミサイル',
          nationalDex: CRAMORANT,
          status: { volatileState: { form: 'gulping' } },
        },
        { status: { currentHp: 200, maxHp: 200 } },
      );

      // Act
      const message = await new GulpMissileEffect().onDamagingHit(
        get(1),
        get(2),
        createHit(),
        context(),
      );

      // Assert
      expect(get(2).currentHp).toBe(150);
      expect(get(2).defenseRank).toBe(-1);
      expect(get(1).volatileState.form).toBeUndefined();
      expect(message).toContain('Gulp Missile activated!');
    });

    it('まるのみのすがたで攻撃を受けたら、相手に最大HPの1/4のダメージを与え、まひにする', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {
          ability: 'うのミサイル',
          nationalDex: CRAMORANT,
          status: { volatileState: { form: 'gorging' } },
        },
        { status: { currentHp: 200, maxHp: 200 } },
      );

      // Act
      await new GulpMissileEffect().onDamagingHit(get(1), get(2), createHit(), context());

      // Assert
      expect(get(2).currentHp).toBe(150);
      expect(get(2).statusCondition).toBe(StatusCondition.Paralysis);
      expect(get(1).volatileState.form).toBeUndefined();
    });

    it('自分がひんしになったヒットでも、相手にダメージを与える', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {
          ability: 'うのミサイル',
          nationalDex: CRAMORANT,
          status: { currentHp: 0, volatileState: { form: 'gulping' } },
        },
        { status: { currentHp: 200, maxHp: 200 } },
      );

      // Act
      await new GulpMissileEffect().onDamagingHit(get(1), get(2), createHit(), context());

      // Assert
      expect(get(2).currentHp).toBe(150);
      expect(get(1).volatileState.form).toBeUndefined();
    });

    it('エサをくわえていなければ、何もしない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'うのミサイル', nationalDex: CRAMORANT },
        { status: { currentHp: 200, maxHp: 200 } },
      );

      // Act
      const message = await new GulpMissileEffect().onDamagingHit(
        get(1),
        get(2),
        createHit(),
        context(),
      );

      // Assert
      expect(message).toBeNull();
      expect(get(2).currentHp).toBe(200);
    });

    it('攻撃側が場にいない（控えのポケモンのみらいよち）ときは、何もせずフォルムもそのまま', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {
          ability: 'うのミサイル',
          nationalDex: CRAMORANT,
          status: { volatileState: { form: 'gulping' } },
        },
        { status: { isActive: false, currentHp: 200, maxHp: 200 } },
      );

      // Act
      const message = await new GulpMissileEffect().onDamagingHit(
        get(1),
        get(2),
        createHit(),
        context(),
      );

      // Assert
      expect(message).toBeNull();
      expect(get(2).currentHp).toBe(200);
      expect(get(2).defenseRank).toBe(0);
      expect(get(1).volatileState.form).toBe('gulping');
    });

    it('ダイビングで隠れているときに攻撃を受けても、何もしない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {
          ability: 'うのミサイル',
          nationalDex: CRAMORANT,
          status: { volatileState: { form: 'gulping', semiInvulnerable: 'underwater' } },
        },
        { status: { currentHp: 200, maxHp: 200 } },
      );

      // Act
      const message = await new GulpMissileEffect().onDamagingHit(
        get(1),
        get(2),
        createHit(),
        context(),
      );

      // Assert
      expect(message).toBeNull();
      expect(get(2).currentHp).toBe(200);
      expect(get(1).volatileState.form).toBe('gulping');
    });
  });
});
