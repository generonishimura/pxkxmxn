import { MoveRegistry } from '../move-registry';
import { NoOpEffect } from './no-op-effect';

describe('シングルバトルで効果のない技（ダブルバトル専用）の登録', () => {
  beforeEach(() => {
    MoveRegistry.clear();
    MoveRegistry.initialize();
  });

  it.each([
    'サイドチェンジ',
    'てだすけ',
    'デコレーション',
    'コーチング',
    'アロマミスト',
    'ドラゴンエール',
    'このゆびとまれ',
    'いかりのこな',
    'おさきにどうぞ',
    'さきおくり',
    'スポットライト',
  ])('%s は共有の NoOpEffect インスタンスとして登録されている', name => {
    // Arrange
    const shared = MoveRegistry.get('はねる');

    // Act
    const effect = MoveRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(NoOpEffect);
    expect(effect).toBe(shared);
  });
});
