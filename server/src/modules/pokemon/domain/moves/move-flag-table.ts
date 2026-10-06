import type { MoveFlag } from './move-flags';

/**
 * 技名（DB の name = PokeAPI ja-Hrkt）ごとの静的な技フラグ表
 *
 * Pokemon Showdown（data/moves.ts、第9世代）の flags を、PokeAPI の技番号で日本語名に対応付けて作成した。
 * 対象フラグ: contact / punch / bite / sound / pulse / bullet(ballistic) / slicing / wind / powder / heal
 * 表にない技はフラグなし（非接触など）として扱う。
 *
 * 追加方法: `['<DBの技名>', ['contact', 'punch']],` の形で1行追加する（英語名はコメントに書く）。
 */
export const MOVE_FLAG_TABLE: ReadonlyArray<readonly [string, readonly MoveFlag[]]> = [
  ['はたく', ['contact']], // Pound
  ['からてチョップ', ['contact']], // Karate Chop
  ['おうふくビンタ', ['contact']], // Double Slap
  ['れんぞくパンチ', ['contact', 'punch']], // Comet Punch
  ['メガトンパンチ', ['contact', 'punch']], // Mega Punch
  ['ほのおのパンチ', ['contact', 'punch']], // Fire Punch
  ['れいとうパンチ', ['contact', 'punch']], // Ice Punch
  ['かみなりパンチ', ['contact', 'punch']], // Thunder Punch
  ['ひっかく', ['contact']], // Scratch
  ['はさむ', ['contact']], // Vise Grip
  ['ハサミギロチン', ['contact']], // Guillotine
  ['いあいぎり', ['contact', 'slicing']], // Cut
  ['かぜおこし', ['wind']], // Gust
  ['つばさでうつ', ['contact']], // Wing Attack
  ['ふきとばし', ['wind']], // Whirlwind
  ['そらをとぶ', ['contact']], // Fly
  ['しめつける', ['contact']], // Bind
  ['たたきつける', ['contact']], // Slam
  ['つるのムチ', ['contact']], // Vine Whip
  ['ふみつけ', ['contact']], // Stomp
  ['にどげり', ['contact']], // Double Kick
  ['メガトンキック', ['contact']], // Mega Kick
  ['とびげり', ['contact']], // Jump Kick
  ['まわしげり', ['contact']], // Rolling Kick
  ['ずつき', ['contact']], // Headbutt
  ['つのでつく', ['contact']], // Horn Attack
  ['みだれづき', ['contact']], // Fury Attack
  ['つのドリル', ['contact']], // Horn Drill
  ['たいあたり', ['contact']], // Tackle
  ['のしかかり', ['contact']], // Body Slam
  ['まきつく', ['contact']], // Wrap
  ['とっしん', ['contact']], // Take Down
  ['あばれる', ['contact']], // Thrash
  ['すてみタックル', ['contact']], // Double-Edge
  ['かみつく', ['contact', 'bite']], // Bite
  ['なきごえ', ['sound']], // Growl
  ['ほえる', ['sound']], // Roar
  ['うたう', ['sound']], // Sing
  ['ちょうおんぱ', ['sound']], // Supersonic
  ['ふぶき', ['wind']], // Blizzard
  ['つつく', ['contact']], // Peck
  ['ドリルくちばし', ['contact']], // Drill Peck
  ['じごくぐるま', ['contact']], // Submission
  ['けたぐり', ['contact']], // Low Kick
  ['カウンター', ['contact']], // Counter
  ['ちきゅうなげ', ['contact']], // Seismic Toss
  ['かいりき', ['contact']], // Strength
  ['すいとる', ['heal']], // Absorb
  ['メガドレイン', ['heal']], // Mega Drain
  ['はっぱカッター', ['slicing']], // Razor Leaf
  ['どくのこな', ['powder']], // Poison Powder
  ['しびれごな', ['powder']], // Stun Spore
  ['ねむりごな', ['powder']], // Sleep Powder
  ['はなびらのまい', ['contact']], // Petal Dance
  ['あなをほる', ['contact']], // Dig
  ['でんこうせっか', ['contact']], // Quick Attack
  ['いかり', ['contact']], // Rage
  ['いやなおと', ['sound']], // Screech
  ['じこさいせい', ['heal']], // Recover
  ['がまん', ['contact']], // Bide
  ['タマゴばくだん', ['ballistic']], // Egg Bomb
  ['したでなめる', ['contact']], // Lick
  ['たきのぼり', ['contact']], // Waterfall
  ['からではさむ', ['contact']], // Clamp
  ['ロケットずつき', ['contact']], // Skull Bash
  ['からみつく', ['contact']], // Constrict
  ['タマゴうみ', ['heal']], // Soft-Boiled
  ['とびひざげり', ['contact']], // High Jump Kick
  ['ゆめくい', ['heal']], // Dream Eater
  ['たまなげ', ['ballistic']], // Barrage
  ['きゅうけつ', ['contact', 'heal']], // Leech Life
  ['ピヨピヨパンチ', ['contact', 'punch']], // Dizzy Punch
  ['キノコのほうし', ['powder']], // Spore
  ['クラブハンマー', ['contact']], // Crabhammer
  ['みだれひっかき', ['contact']], // Fury Swipes
  ['ねむる', ['heal']], // Rest
  ['ひっさつまえば', ['contact', 'bite']], // Hyper Fang
  ['いかりのまえば', ['contact']], // Super Fang
  ['きりさく', ['contact', 'slicing']], // Slash
  ['わるあがき', ['contact']], // Struggle
  ['トリプルキック', ['contact']], // Triple Kick
  ['どろぼう', ['contact']], // Thief
  ['かえんぐるま', ['contact']], // Flame Wheel
  ['いびき', ['sound']], // Snore
  ['じたばた', ['contact']], // Flail
  ['エアロブラスト', ['wind']], // Aeroblast
  ['わたほうし', ['powder']], // Cotton Spore
  ['きしかいせい', ['contact']], // Reversal
  ['マッハパンチ', ['contact', 'punch']], // Mach Punch
  ['だましうち', ['contact']], // Feint Attack
  ['ヘドロばくだん', ['ballistic']], // Sludge Bomb
  ['オクタンほう', ['ballistic']], // Octazooka
  ['でんじほう', ['ballistic']], // Zap Cannon
  ['ほろびのうた', ['sound']], // Perish Song
  ['こごえるかぜ', ['wind']], // Icy Wind
  ['げきりん', ['contact']], // Outrage
  ['すなあらし', ['wind']], // Sandstorm
  ['ギガドレイン', ['heal']], // Giga Drain
  ['ころがる', ['contact']], // Rollout
  ['みねうち', ['contact']], // False Swipe
  ['ミルクのみ', ['heal']], // Milk Drink
  ['スパーク', ['contact']], // Spark
  ['れんぞくぎり', ['contact', 'slicing']], // Fury Cutter
  ['はがねのつばさ', ['contact']], // Steel Wing
  ['いやしのすず', ['sound']], // Heal Bell
  ['おんがえし', ['contact']], // Return
  ['やつあたり', ['contact']], // Frustration
  ['ばくれつパンチ', ['contact', 'punch']], // Dynamic Punch
  ['メガホーン', ['contact']], // Megahorn
  ['おいうち', ['contact']], // Pursuit
  ['こうそくスピン', ['contact']], // Rapid Spin
  ['アイアンテール', ['contact']], // Iron Tail
  ['メタルクロー', ['contact']], // Metal Claw
  ['あてみなげ', ['contact']], // Vital Throw
  ['あさのひざし', ['heal']], // Morning Sun
  ['こうごうせい', ['heal']], // Synthesis
  ['つきのひかり', ['heal']], // Moonlight
  ['クロスチョップ', ['contact']], // Cross Chop
  ['たつまき', ['wind']], // Twister
  ['かみくだく', ['contact', 'bite']], // Crunch
  ['しんそく', ['contact']], // Extreme Speed
  ['シャドーボール', ['ballistic']], // Shadow Ball
  ['いわくだき', ['contact']], // Rock Smash
  ['ねこだまし', ['contact']], // Fake Out
  ['さわぐ', ['sound']], // Uproar
  ['のみこむ', ['heal']], // Swallow
  ['ねっぷう', ['wind']], // Heat Wave
  ['からげんき', ['contact']], // Facade
  ['きあいパンチ', ['contact', 'punch']], // Focus Punch
  ['きつけ', ['contact']], // Smelling Salts
  ['ねがいごと', ['heal']], // Wish
  ['ばかぢから', ['contact']], // Superpower
  ['リベンジ', ['contact']], // Revenge
  ['かわらわり', ['contact']], // Brick Break
  ['はたきおとす', ['contact']], // Knock Off
  ['がむしゃら', ['contact']], // Endeavor
  ['ダイビング', ['contact']], // Dive
  ['つっぱり', ['contact']], // Arm Thrust
  ['ミストボール', ['ballistic']], // Mist Ball
  ['ブレイズキック', ['contact']], // Blaze Kick
  ['アイスボール', ['contact', 'ballistic']], // Ice Ball
  ['ニードルアーム', ['contact']], // Needle Arm
  ['なまける', ['heal']], // Slack Off
  ['ハイパーボイス', ['sound']], // Hyper Voice
  ['どくどくのキバ', ['contact', 'bite']], // Poison Fang
  ['ブレイククロー', ['contact']], // Crush Claw
  ['コメットパンチ', ['contact', 'punch']], // Meteor Mash
  ['おどろかす', ['contact']], // Astonish
  ['ウェザーボール', ['ballistic']], // Weather Ball
  ['エアカッター', ['slicing', 'wind']], // Air Cutter
  ['きんぞくおん', ['sound']], // Metal Sound
  ['くさぶえ', ['sound']], // Grass Whistle
  ['シャドーパンチ', ['contact', 'punch']], // Shadow Punch
  ['スカイアッパー', ['contact', 'punch']], // Sky Uppercut
  ['タネマシンガン', ['ballistic']], // Bullet Seed
  ['つばめがえし', ['contact', 'slicing']], // Aerial Ace
  ['とおぼえ', ['sound']], // Howl
  ['ドラゴンクロー', ['contact']], // Dragon Claw
  ['とびはねる', ['contact']], // Bounce
  ['ポイズンテール', ['contact']], // Poison Tail
  ['ほしがる', ['contact']], // Covet
  ['ボルテッカー', ['contact']], // Volt Tackle
  ['リーフブレード', ['contact', 'slicing']], // Leaf Blade
  ['ロックブラスト', ['ballistic']], // Rock Blast
  ['みずのはどう', ['pulse']], // Water Pulse
  ['はねやすめ', ['heal']], // Roost
  ['めざましビンタ', ['contact']], // Wake-Up Slap
  ['アームハンマー', ['contact', 'punch']], // Hammer Arm
  ['ジャイロボール', ['contact', 'ballistic']], // Gyro Ball
  ['いやしのねがい', ['heal']], // Healing Wish
  ['ついばむ', ['contact']], // Pluck
  ['おいかぜ', ['wind']], // Tailwind
  ['とんぼがえり', ['contact']], // U-turn
  ['インファイト', ['contact']], // Close Combat
  ['しっぺがえし', ['contact']], // Payback
  ['ダメおし', ['contact']], // Assurance
  ['きりふだ', ['contact']], // Trump Card
  ['しぼりとる', ['contact']], // Wring Out
  ['おしおき', ['contact']], // Punishment
  ['とっておき', ['contact']], // Last Resort
  ['ふいうち', ['contact']], // Sucker Punch
  ['フレアドライブ', ['contact']], // Flare Blitz
  ['はっけい', ['contact']], // Force Palm
  ['はどうだん', ['pulse', 'ballistic']], // Aura Sphere
  ['どくづき', ['contact']], // Poison Jab
  ['あくのはどう', ['pulse']], // Dark Pulse
  ['つじぎり', ['contact', 'slicing']], // Night Slash
  ['アクアテール', ['contact']], // Aqua Tail
  ['タネばくだん', ['ballistic']], // Seed Bomb
  ['エアスラッシュ', ['slicing']], // Air Slash
  ['シザークロス', ['contact', 'slicing']], // X-Scissor
  ['むしのさざめき', ['sound']], // Bug Buzz
  ['りゅうのはどう', ['pulse']], // Dragon Pulse
  ['ドラゴンダイブ', ['contact']], // Dragon Rush
  ['ドレインパンチ', ['contact', 'punch', 'heal']], // Drain Punch
  ['きあいだま', ['ballistic']], // Focus Blast
  ['エナジーボール', ['ballistic']], // Energy Ball
  ['ブレイブバード', ['contact']], // Brave Bird
  ['ギガインパクト', ['contact']], // Giga Impact
  ['バレットパンチ', ['contact', 'punch']], // Bullet Punch
  ['ゆきなだれ', ['contact']], // Avalanche
  ['シャドークロー', ['contact']], // Shadow Claw
  ['かみなりのキバ', ['contact', 'bite']], // Thunder Fang
  ['こおりのキバ', ['contact', 'bite']], // Ice Fang
  ['ほのおのキバ', ['contact', 'bite']], // Fire Fang
  ['かげうち', ['contact']], // Shadow Sneak
  ['どろばくだん', ['ballistic']], // Mud Bomb
  ['サイコカッター', ['slicing']], // Psycho Cut
  ['しねんのずつき', ['contact']], // Zen Headbutt
  ['ロッククライム', ['contact']], // Rock Climb
  ['パワーウィップ', ['contact']], // Power Whip
  ['がんせきほう', ['ballistic']], // Rock Wrecker
  ['クロスポイズン', ['contact', 'slicing']], // Cross Poison
  ['アイアンヘッド', ['contact']], // Iron Head
  ['マグネットボム', ['ballistic']], // Magnet Bomb
  ['くさむすび', ['contact']], // Grass Knot
  ['おしゃべり', ['sound']], // Chatter
  ['むしくい', ['contact']], // Bug Bite
  ['ウッドハンマー', ['contact']], // Wood Hammer
  ['アクアジェット', ['contact']], // Aqua Jet
  ['かいふくしれい', ['heal']], // Heal Order
  ['もろはのずつき', ['contact']], // Head Smash
  ['ダブルアタック', ['contact']], // Double Hit
  ['みかづきのまい', ['heal']], // Lunar Dance
  ['にぎりつぶす', ['contact']], // Crush Grip
  ['シャドーダイブ', ['contact']], // Shadow Force
  ['いかりのこな', ['powder']], // Rage Powder
  ['やまあらし', ['contact']], // Storm Throw
  ['ヘビーボンバー', ['contact']], // Heavy Slam
  ['エレキボール', ['ballistic']], // Electro Ball
  ['ニトロチャージ', ['contact']], // Flame Charge
  ['ローキック', ['contact']], // Low Sweep
  ['アシッドボム', ['ballistic']], // Acid Spray
  ['イカサマ', ['contact']], // Foul Play
  ['りんしょう', ['sound']], // Round
  ['エコーボイス', ['sound']], // Echoed Voice
  ['なしくずし', ['contact']], // Chip Away
  ['いやしのはどう', ['pulse', 'heal']], // Heal Pulse
  ['フリーフォール', ['contact']], // Sky Drop
  ['ともえなげ', ['contact']], // Circle Throw
  ['アクロバット', ['contact']], // Acrobatics
  ['かたきうち', ['contact']], // Retaliate
  ['ドラゴンテール', ['contact']], // Dragon Tail
  ['ワイルドボルト', ['contact']], // Wild Charge
  ['ドリルライナー', ['contact']], // Drill Run
  ['ダブルチョップ', ['contact']], // Dual Chop
  ['ハートスタンプ', ['contact']], // Heart Stamp
  ['ウッドホーン', ['contact', 'heal']], // Horn Leech
  ['せいなるつるぎ', ['contact', 'slicing']], // Sacred Sword
  ['シェルブレード', ['contact', 'slicing']], // Razor Shell
  ['ヒートスタンプ', ['contact']], // Heat Crash
  ['ハードローラー', ['contact']], // Steamroller
  ['スイープビンタ', ['contact']], // Tail Slap
  ['ぼうふう', ['wind']], // Hurricane
  ['アフロブレイク', ['contact']], // Head Charge
  ['ギアソーサー', ['contact']], // Gear Grind
  ['かえんだん', ['ballistic']], // Searing Shot
  ['いにしえのうた', ['sound']], // Relic Song
  ['しんぴのつるぎ', ['slicing']], // Secret Sword
  ['らいげき', ['contact']], // Bolt Strike
  ['バークアウト', ['sound']], // Snarl
  ['Ｖジェネレート', ['contact']], // V-create
  ['フライングプレス', ['contact']], // Flying Press
  ['とどめばり', ['contact']], // Fell Stinger
  ['ゴーストダイブ', ['contact']], // Phantom Force
  ['おたけび', ['sound']], // Noble Roar
  ['パラボラチャージ', ['heal']], // Parabolic Charge
  ['はなふぶき', ['wind']], // Petal Blizzard
  ['チャームボイス', ['sound']], // Disarming Voice
  ['すてゼリフ', ['sound']], // Parting Shot
  ['ドレインキッス', ['contact', 'heal']], // Draining Kiss
  ['じゃれつく', ['contact']], // Play Rough
  ['ようせいのかぜ', ['wind']], // Fairy Wind
  ['ばくおんぱ', ['sound']], // Boomburst
  ['ないしょばなし', ['sound']], // Confide
  ['ふんじん', ['powder']], // Powder
  ['ほっぺすりすり', ['contact']], // Nuzzle
  ['てかげん', ['contact']], // Hold Back
  ['まとわりつく', ['contact']], // Infestation
  ['グロウパンチ', ['contact', 'punch']], // Power-Up Punch
  ['デスウイング', ['heal']], // Oblivion Wing
  ['こんげんのはどう', ['pulse']], // Origin Pulse
  ['ガリョウテンセイ', ['contact']], // Dragon Ascent
  ['すなあつめ', ['heal']], // Shore Up
  ['であいがしら', ['contact']], // First Impression
  ['ＤＤラリアット', ['contact']], // Darkest Lariat
  ['うたかたのアリア', ['sound']], // Sparkling Aria
  ['アイスハンマー', ['contact', 'punch']], // Ice Hammer
  ['フラワーヒール', ['heal']], // Floral Healing
  ['１０まんばりき', ['contact']], // High Horsepower
  ['ちからをすいとる', ['heal']], // Strength Sap
  ['ソーラーブレード', ['contact', 'slicing']], // Solar Blade
  ['じごくづき', ['contact']], // Throat Chop
  ['かふんだんご', ['ballistic']], // Pollen Puff
  ['アンカーショット', ['contact']], // Anchor Shot
  ['とびかかる', ['contact']], // Lunge
  ['ほのおのムチ', ['contact']], // Fire Lash
  ['つけあがる', ['contact']], // Power Trip
  ['スマートホーン', ['contact']], // Smart Strike
  ['じょうか', ['heal']], // Purify
  ['トロピカルキック', ['contact']], // Trop Kick
  ['くちばしキャノン', ['ballistic']], // Beak Blast
  ['スケイルノイズ', ['sound']], // Clanging Scales
  ['ドラゴンハンマー', ['contact']], // Dragon Hammer
  ['ぶんまわす', ['contact']], // Brutal Swing
  ['サイコファング', ['contact', 'bite']], // Psychic Fangs
  ['じだんだ', ['contact']], // Stomping Tantrum
  ['アクセルロック', ['contact']], // Accelerock
  ['アクアブレイク', ['contact']], // Liquidation
  ['シャドースチール', ['contact']], // Spectral Thief
  ['メテオドライブ', ['contact']], // Sunsteel Strike
  ['びりびりちくちく', ['contact']], // Zing Zap
  ['マルチアタック', ['contact']], // Multi-Attack
  ['プラズマフィスト', ['contact', 'punch']], // Plasma Fists
  ['ダブルパンツァー', ['contact', 'punch']], // Double Iron Bash
  ['くらいつく', ['contact', 'bite']], // Jaw Lock
  ['まほうのこな', ['powder']], // Magic Powder
  ['でんげきくちばし', ['contact']], // Bolt Beak
  ['エラがみ', ['contact', 'bite']], // Fishious Rend
  ['ソウルビート', ['sound']], // Clangorous Soul
  ['ボディプレス', ['contact']], // Body Press
  ['トラバサミ', ['contact']], // Snap Trap
  ['かえんボール', ['ballistic']], // Pyro Ball
  ['きょじゅうざん', ['contact', 'slicing']], // Behemoth Blade
  ['きょじゅうだん', ['contact']], // Behemoth Bash
  ['ワイドブレイカー', ['contact']], // Breaking Swipe
  ['えだづき', ['contact']], // Branch Poke
  ['オーバードライブ', ['sound']], // Overdrive
  ['ソウルクラッシュ', ['contact']], // Spirit Break
  ['いのちのしずく', ['heal']], // Life Dew
  ['どげざつき', ['contact']], // False Surrender
  ['アイアンローラー', ['contact']], // Steel Roller
  ['グラススライダー', ['contact']], // Grassy Glide
  ['だいちのはどう', ['pulse']], // Terrain Pulse
  ['はいよるいちげき', ['contact']], // Skitter Smack
  ['うっぷんばらし', ['contact']], // Lash Out
  ['クイックターン', ['contact']], // Flip Turn
  ['トリプルアクセル', ['contact']], // Triple Axel
  ['ダブルウイング', ['contact']], // Dual Wingbeat
  ['ジャングルヒール', ['heal']], // Jungle Healing
  ['あんこくきょうだ', ['contact', 'punch']], // Wicked Blow
  ['すいりゅうれんだ', ['contact', 'punch']], // Surging Strikes
  ['らいめいげり', ['contact']], // Thunderous Kick
  ['ぶきみなじゅもん', ['sound']], // Eerie Spell
  ['フェイタルクロー', ['contact']], // Dire Claw
  ['バリアーラッシュ', ['contact']], // Psyshield Bash
  ['がんせきアックス', ['contact', 'slicing']], // Stone Axe
  ['はるのあらし', ['wind']], // Springtide Storm
  ['ウェーブタックル', ['contact']], // Wave Crash
  ['ぶちかまし', ['contact', 'punch']], // Headlong Rush
  ['ひけん・ちえなみ', ['contact', 'slicing']], // Ceaseless Edge
  ['こがらしあらし', ['wind']], // Bleakwind Storm
  ['かみなりあらし', ['wind']], // Wildbolt Storm
  ['ねっさのあらし', ['wind']], // Sandsear Storm
  ['みかづきのいのり', ['heal']], // Lunar Blessing
  ['かかとおとし', ['contact']], // Axe Kick
  ['ジェットパンチ', ['contact', 'punch']], // Jet Punch
  ['ホイールスピン', ['contact']], // Spin Out
  ['ネズミざん', ['contact', 'slicing']], // Population Bomb
  ['アイススピナー', ['contact']], // Ice Spinner
  ['きょけんとつげき', ['contact']], // Glaive Rush
  ['さいきのいのり', ['heal']], // Revival Blessing
  ['トリプルダイブ', ['contact']], // Triple Dive
  ['キラースピン', ['contact']], // Mortal Spin
  ['ドゲザン', ['contact', 'slicing']], // Kowtow Cleave
  ['フレアソング', ['sound']], // Torch Song
  ['アクアステップ', ['contact']], // Aqua Step
  ['レイジングブル', ['contact']], // Raging Bull
  ['サイコブレイド', ['contact', 'slicing']], // Psyblade
  ['アクセルブレイク', ['contact']], // Collision Course
  ['イナズマドライブ', ['contact']], // Electro Drift
  ['とびつく', ['contact']], // Pounce
  ['くさわけ', ['contact']], // Trailblaze
  ['ハイパードリル', ['contact']], // Hyper Drill
  ['ふんどのこぶし', ['contact', 'punch']], // Rage Fist
  ['むねんのつるぎ', ['contact', 'slicing', 'heal']], // Bitter Blade
  ['でんこうそうげき', ['contact']], // Double Shock
  ['ほうふく', ['contact']], // Comeuppance
  ['アクアカッター', ['slicing']], // Aqua Cutter
  ['シャカシャカほう', ['heal']], // Matcha Gotcha
  ['みずあめボム', ['ballistic']], // Syrup Bomb
  ['パワフルエッジ', ['contact', 'slicing']], // Mighty Cleave
  ['タキオンカッター', ['slicing']], // Tachyon Cutter
  ['ハードプレス', ['contact']], // Hard Press
  ['みわくのボイス', ['sound']], // Alluring Voice
  ['やけっぱち', ['contact']], // Temper Flare
  ['サンダーダイブ', ['contact']], // Supercell Slam
  ['サイコノイズ', ['sound']], // Psychic Noise
  ['はやてがえし', ['contact']], // Upper Hand
];
