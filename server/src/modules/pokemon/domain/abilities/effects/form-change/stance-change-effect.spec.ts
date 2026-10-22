import { StanceChangeEffect } from './stance-change-effect';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('StanceChangeEffect（バトルスイッチ）', () => {
  const AEGISLASH = 681;
  const effect = new StanceChangeEffect();

  it('攻撃技を出す直前に、ブレードフォルムになる', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ nationalDex: AEGISLASH });

    // Act
    const result = await effect.onPrepareHit(
      get(1),
      get(2),
      context({ moveName: 'たいあたり', moveCategory: 'Physical' }),
    );

    // Assert
    expect(get(1).volatileState.form).toBe('blade');
    expect(result).toBe('changed to Blade Forme!');
  });

  it('特殊技でも、ブレードフォルムになる', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ nationalDex: AEGISLASH });

    // Act
    await effect.onPrepareHit(
      get(1),
      get(2),
      context({ moveName: 'シャドーボール', moveCategory: 'Special' }),
    );

    // Assert
    expect(get(1).volatileState.form).toBe('blade');
  });

  it('ブレードフォルムでキングシールドを出すと、シールドフォルムに戻る', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      nationalDex: AEGISLASH,
      status: { volatileState: { form: 'blade' } },
    });

    // Act
    const result = await effect.onPrepareHit(
      get(1),
      get(2),
      context({ moveName: 'キングシールド', moveCategory: 'Status' }),
    );

    // Assert
    expect(get(1).volatileState.form).toBe('shield');
    expect(result).toBe('changed to Shield Forme!');
  });

  it('シールドフォルムのままキングシールドを出しても、何も起きない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ nationalDex: AEGISLASH });

    // Act
    const result = await effect.onPrepareHit(
      get(1),
      get(2),
      context({ moveName: 'キングシールド', moveCategory: 'Status' }),
    );

    // Assert
    expect(get(1).volatileState.form).toBeUndefined();
    expect(result).toBeNull();
  });

  it('ブレードフォルムのまま攻撃技を出しても、メッセージは出ない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      nationalDex: AEGISLASH,
      status: { volatileState: { form: 'blade' } },
    });

    // Act
    const result = await effect.onPrepareHit(
      get(1),
      get(2),
      context({ moveName: 'たいあたり', moveCategory: 'Physical' }),
    );

    // Assert
    expect(result).toBeNull();
  });

  it('キングシールド以外の変化技では、フォルムは変わらない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      nationalDex: AEGISLASH,
      status: { volatileState: { form: 'blade' } },
    });

    // Act
    const result = await effect.onPrepareHit(
      get(1),
      get(2),
      context({ moveName: 'つるぎのまい', moveCategory: 'Status' }),
    );

    // Assert
    expect(get(1).volatileState.form).toBe('blade');
    expect(result).toBeNull();
  });

  it('ギルガルドでなければ、フォルムは変わらない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ nationalDex: 25 });

    // Act
    const result = await effect.onPrepareHit(
      get(1),
      get(2),
      context({ moveName: 'たいあたり', moveCategory: 'Physical' }),
    );

    // Assert
    expect(get(1).volatileState.form).toBeUndefined();
    expect(result).toBeNull();
  });

  it('へんしん中は、フォルムは変わらない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      nationalDex: AEGISLASH,
      status: { volatileState: { transformedIntoStatusId: 2 } },
    });

    // Act
    const result = await effect.onPrepareHit(
      get(1),
      get(2),
      context({ moveName: 'たいあたり', moveCategory: 'Physical' }),
    );

    // Assert
    expect(get(1).volatileState.form).toBeUndefined();
    expect(result).toBeNull();
  });
});
