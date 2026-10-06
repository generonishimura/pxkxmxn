import { MoveRegistry } from './move-registry';
import { BaseMultiHitEffect } from './effects/base-multi-hit-effect';

/**
 * 連続技の攻撃回数の表（Pokemon Showdown data/moves.ts の multihit、第9世代）
 * 技名は DB の name（PokeAPI ja-Hrkt）
 */
const KNOWN_MULTI_HIT_MOVES: ReadonlyMap<string, { min: number; max: number }> = new Map([
  ['おうふくビンタ', { min: 2, max: 5 }], // Double Slap
  ['れんぞくパンチ', { min: 2, max: 5 }], // Comet Punch
  ['にどげり', { min: 2, max: 2 }], // Double Kick
  ['みだれづき', { min: 2, max: 5 }], // Fury Attack
  ['ダブルニードル', { min: 2, max: 2 }], // Twineedle
  ['ミサイルばり', { min: 2, max: 5 }], // Pin Missile
  ['とげキャノン', { min: 2, max: 5 }], // Spike Cannon
  ['たまなげ', { min: 2, max: 5 }], // Barrage
  ['みだれひっかき', { min: 2, max: 5 }], // Fury Swipes
  ['ホネブーメラン', { min: 2, max: 2 }], // Bonemerang
  ['トリプルキック', { min: 3, max: 3 }], // Triple Kick
  ['ボーンラッシュ', { min: 2, max: 5 }], // Bone Rush
  ['つっぱり', { min: 2, max: 5 }], // Arm Thrust
  ['タネマシンガン', { min: 2, max: 5 }], // Bullet Seed
  ['つららばり', { min: 2, max: 5 }], // Icicle Spear
  ['ロックブラスト', { min: 2, max: 5 }], // Rock Blast
  ['ダブルアタック', { min: 2, max: 2 }], // Double Hit
  ['ダブルチョップ', { min: 2, max: 2 }], // Dual Chop
  ['スイープビンタ', { min: 2, max: 5 }], // Tail Slap
  ['ギアソーサー', { min: 2, max: 2 }], // Gear Grind
  ['みずしゅりけん', { min: 2, max: 5 }], // Water Shuriken
  ['ダブルパンツァー', { min: 2, max: 2 }], // Double Iron Bash
  ['ドラゴンアロー', { min: 2, max: 2 }], // Dragon Darts
  ['スケイルショット', { min: 2, max: 5 }], // Scale Shot
  ['トリプルアクセル', { min: 3, max: 3 }], // Triple Axel
  ['ダブルウイング', { min: 2, max: 2 }], // Dual Wingbeat
  ['すいりゅうれんだ', { min: 3, max: 3 }], // Surging Strikes
  ['ネズミざん', { min: 10, max: 10 }], // Population Bomb
  ['トリプルダイブ', { min: 3, max: 3 }], // Triple Dive
  ['ツインビーム', { min: 2, max: 2 }], // Twin Beam
  ['タキオンカッター', { min: 2, max: 2 }], // Tachyon Cutter
]);

describe('MoveRegistry: 連続技', () => {
  beforeEach(() => {
    MoveRegistry.initialize();
  });

  it('連続技として登録した技は、すべて本家の連続技の表にあり、回数が一致する', () => {
    // Arrange
    const multiHitRegistrations = MoveRegistry.listRegistered().flatMap(moveName => {
      const effect = MoveRegistry.get(moveName);
      return effect instanceof BaseMultiHitEffect ? [{ moveName, effect }] : [];
    });

    // Act
    const mismatches = multiHitRegistrations.filter(({ moveName, effect }) => {
      const known = KNOWN_MULTI_HIT_MOVES.get(moveName);
      const range = effect.getHitRange();
      return !known || known.min !== range.min || known.max !== range.max;
    });

    // Assert
    expect(multiHitRegistrations.length).toBeGreaterThan(0);
    expect(mismatches.map(({ moveName }) => moveName)).toEqual([]);
  });

  it('つつくは1回だけ攻撃する技なので、連続技として登録されていない', () => {
    // Act
    const effect = MoveRegistry.get('つつく');

    // Assert
    expect(effect).not.toBeInstanceOf(BaseMultiHitEffect);
  });

  it.each([
    'おうふくビンタ',
    'れんぞくパンチ',
    'にどげり',
    'みだれづき',
    'ダブルニードル',
    'ミサイルばり',
    'とげキャノン',
    'たまなげ',
    'みだれひっかき',
    'ホネブーメラン',
    'ボーンラッシュ',
    'つっぱり',
    'タネマシンガン',
    'つららばり',
    'ロックブラスト',
    'ダブルアタック',
    'ダブルチョップ',
    'スイープビンタ',
    'ギアソーサー',
    'みずしゅりけん',
    'ドラゴンアロー',
    'ダブルウイング',
    'トリプルダイブ',
    'ツインビーム',
    'タキオンカッター',
  ])('%s が連続技として登録されている', moveName => {
    // Act
    const effect = MoveRegistry.get(moveName);

    // Assert
    expect(effect).toBeInstanceOf(BaseMultiHitEffect);
  });
});
