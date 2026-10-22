import type { ExtraMoveBehavior } from './move-behaviors';

/**
 * 急所・まもる系・対象の範囲について、エンジンが使う技の性質の表（技名は DB の name = PokeAPI ja-Hrkt）
 *
 * Pokemon Showdown（data/moves.ts、第9世代）から、PokeAPI の技番号で日本語名に対応付けて作成した。
 * Z 技・ダイマックス技は含めない
 * - highCritRatio: critRatio が 2 の技（急所ランク +1）
 * - alwaysCrit: willCrit の技（必ず急所）
 * - noProtect: 相手を対象にする技のうち、flags に protect がない技（まもる系で防げない）
 * - breaksProtect: breaksProtect の技（当たると相手のまもる系を解く）
 * - spread: target が allAdjacent / allAdjacentFoes の技（ワイドガードで防がれる）
 *
 * 追加方法: 該当する性質の配列に `'<DBの技名>', // <英語名>` を1行足す
 */
export const EXTRA_MOVE_BEHAVIOR_TABLE: Readonly<Record<ExtraMoveBehavior, readonly string[]>> = {
  highCritRatio: [
    'からてチョップ', // Karate Chop
    'かまいたち', // Razor Wind
    'はっぱカッター', // Razor Leaf
    'ゴッドバード', // Sky Attack
    'クラブハンマー', // Crabhammer
    'きりさく', // Slash
    'エアロブラスト', // Aeroblast
    'クロスチョップ', // Cross Chop
    'ブレイズキック', // Blaze Kick
    'エアカッター', // Air Cutter
    'ポイズンテール', // Poison Tail
    'リーフブレード', // Leaf Blade
    'つじぎり', // Night Slash
    'シャドークロー', // Shadow Claw
    'サイコカッター', // Psycho Cut
    'クロスポイズン', // Cross Poison
    'ストーンエッジ', // Stone Edge
    'こうげきしれい', // Attack Order
    'あくうせつだん', // Spacial Rend
    'ドリルライナー', // Drill Run
    'ねらいうち', // Snipe Shot
    'オーラウイング', // Esper Wing
    '３ぼんのや', // Triple Arrows
    'アクアカッター', // Aqua Cutter
    'ツタこんぼう', // Ivy Cudgel
  ],
  alwaysCrit: [
    'やまあらし', // Storm Throw
    'こおりのいぶき', // Frost Breath
    'あんこくきょうだ', // Wicked Blow
    'すいりゅうれんだ', // Surging Strikes
    'トリックフラワー', // Flower Trick
  ],
  noProtect: [
    'ふきとばし', // Whirlwind
    'ほえる', // Roar
    'オウムがえし', // Mirror Move
    'へんしん', // Transform
    'スケッチ', // Sketch
    'のろい', // Curse
    'テクスチャー２', // Conversion 2
    'くろいまなざし', // Mean Look
    'じこあんじ', // Psych Up
    'みらいよち', // Future Sight
    'しぜんのちから', // Nature Power
    'なりきり', // Role Play
    'とおせんぼう', // Block
    'はめつのねがい', // Doom Desire
    'フェイント', // Feint
    'シャドーダイブ', // Shadow Force
    'おさきにどうぞ', // After You
    'ギフトパス', // Bestow
    'ゴーストダイブ', // Phantom Force
    'なかよくする', // Play Nice
    'ないしょばなし', // Confide
    'いじげんホール', // Hyperspace Hole
    'いじげんラッシュ', // Hyperspace Fury
    'なみだめ', // Tearful Look
    'デコレーション', // Decorate
    'うつしえ', // Doodle
    'ハイパードリル', // Hyper Drill
    'パワフルエッジ', // Mighty Cleave
  ],
  breaksProtect: [
    'フェイント', // Feint
    'シャドーダイブ', // Shadow Force
    'ゴーストダイブ', // Phantom Force
    'いじげんホール', // Hyperspace Hole
    'いじげんラッシュ', // Hyperspace Fury
  ],
  spread: [
    'かまいたち', // Razor Wind
    'しっぽをふる', // Tail Whip
    'にらみつける', // Leer
    'なきごえ', // Growl
    'ようかいえき', // Acid
    'なみのり', // Surf
    'ふぶき', // Blizzard
    'はっぱカッター', // Razor Leaf
    'いとをはく', // String Shot
    'じしん', // Earthquake
    'じばく', // Self-Destruct
    'スピードスター', // Swift
    'どくガス', // Poison Gas
    'あわ', // Bubble
    'だいばくはつ', // Explosion
    'いわなだれ', // Rock Slide
    'わたほうし', // Cotton Spore
    'こなゆき', // Powder Snow
    'こごえるかぜ', // Icy Wind
    'マグニチュード', // Magnitude
    'あまいかおり', // Sweet Scent
    'たつまき', // Twister
    'ねっぷう', // Heat Wave
    'ふんか', // Eruption
    'フラフラダンス', // Teeter Dance
    'ハイパーボイス', // Hyper Voice
    'エアカッター', // Air Cutter
    'しおふき', // Water Spout
    'だくりゅう', // Muddy Water
    'かいふくふうじ', // Heal Block
    'ほうでん', // Discharge
    'ふんえん', // Lava Plume
    'ゆうわく', // Captivate
    'ダークホール', // Dark Void
    'ヘドロウェーブ', // Sludge Wave
    'シンクロノイズ', // Synchronoise
    'やきつくす', // Incinerate
    'むしのていこう', // Struggle Bug
    'じならし', // Bulldoze
    'エレキネット', // Electroweb
    'かえんだん', // Searing Shot
    'いにしえのうた', // Relic Song
    'こごえるせかい', // Glaciate
    'バークアウト', // Snarl
    'パラボラチャージ', // Parabolic Charge
    'はなふぶき', // Petal Blizzard
    'チャームボイス', // Disarming Voice
    'ばくおんぱ', // Boomburst
    'ダイヤストーム', // Diamond Storm
    'ベノムトラップ', // Venom Drench
    'マジカルシャイン', // Dazzling Gleam
    'サウザンアロー', // Thousand Arrows
    'サウザンウェーブ', // Thousand Waves
    'グランドフォース', // Land's Wrath
    'こんげんのはどう', // Origin Pulse
    'だんがいのつるぎ', // Precipice Blades
    'うたかたのアリア', // Sparkling Aria
    'コアパニッシャー', // Core Enforcer
    'スケイルノイズ', // Clanging Scales
    'ぶんまわす', // Brutal Swing
    'トラップシェル', // Shell Trap
    'ビックリヘッド', // Mind Blown
    'ざぶざぶサーフ', // Splishy Splash
    'ワイドブレイカー', // Breaking Swipe
    'オーバードライブ', // Overdrive
    'ミストバースト', // Misty Explosion
    'しっとのほのお', // Burning Jealousy
    'ふしょくガス', // Corrosive Gas
    'ドラゴンエナジー', // Dragon Energy
    'もえあがるいかり', // Fiery Wrath
    'ブリザードランス', // Glacial Lance
    'アストラルビット', // Astral Barrage
    'はるのあらし', // Springtide Storm
    'こがらしあらし', // Bleakwind Storm
    'かみなりあらし', // Wildbolt Storm
    'ねっさのあらし', // Sandsear Storm
    'キラースピン', // Mortal Spin
    'ゴールドラッシュ', // Make It Rain
    'シャカシャカほう', // Matcha Gotcha
  ],
};
