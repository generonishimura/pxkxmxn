/**
 * 追加効果（本家の secondary / secondaries）を持つ技の表（DB の name = PokeAPI ja-Hrkt）
 *
 * Pokemon Showdown（data/moves.ts）で secondary または secondaries を持つ攻撃技を、技の性質の表
 * （move-behavior-table.ts）の英語名で日本語名に対応付けて作成した。
 * - 含む: 相手への確率の追加効果（ひるみ・状態異常・能力ランクの低下など）、自分の能力を上げる追加効果
 *   （ニトロチャージ・げんしのちからなど）、本家で「ちからずくで威力が上がる」印として空の secondary を
 *   持つ技（ひけん・ちえなみ・がんせきアックス・ダイヤストーム）
 * - 含まない: とんぼがえり・はたきおとす・反動・インファイトの能力低下など、secondary ではない効果
 * ちからずくは、この表の技の威力を上げ、追加効果をなくす（battleContext.hasSecondaryEffect）
 *
 * 追加方法: `'<DBの技名>', // <英語名>` の形で1行追加する
 */
export const SECONDARY_EFFECT_MOVE_NAMES: ReadonlySet<string> = new Set([
  'ようかいえき', // Acid
  'アシッドボム', // Acid Spray
  'エアスラッシュ', // Air Slash
  'みわくのボイス', // Alluring Voice
  'アンカーショット', // Anchor Shot
  'げんしのちから', // Ancient Power
  'りんごさん', // Apple Acid
  'アクアステップ', // Aqua Step
  'おどろかす', // Astonish
  'オーラぐるま', // Aura Wheel
  'オーロラビーム', // Aurora Beam
  'かかとおとし', // Axe Kick
  'どくばりセンボン', // Barb Barrage
  'かみつく', // Bite
  'うらみつらみ', // Bitter Malice
  'ブレイズキック', // Blaze Kick
  'バーンアクセル', // Blazing Torque
  'こがらしあらし', // Bleakwind Storm
  'ふぶき', // Blizzard
  'あおいほのお', // Blue Flare
  'のしかかり', // Body Slam
  'らいげき', // Bolt Strike
  'ホネこんぼう', // Bone Club
  'とびはねる', // Bounce
  'ワイドブレイカー', // Breaking Swipe
  'あわ', // Bubble
  'バブルこうせん', // Bubble Beam
  'むしのさざめき', // Bug Buzz
  'じならし', // Bulldoze
  'しっとのほのお', // Burning Jealousy
  'びりびりエレキ', // Buzzy Buzz
  'ひけん・ちえなみ', // Ceaseless Edge
  'チャージビーム', // Charge Beam
  'おしゃべり', // Chatter
  'ひやみず', // Chilling Water
  'ファイトアクセル', // Combat Torque
  'ねんりき', // Confusion
  'からみつく', // Constrict
  'クロスポイズン', // Cross Poison
  'かみくだく', // Crunch
  'ブレイククロー', // Crush Claw
  'あくのはどう', // Dark Pulse
  'ダイヤストーム', // Diamond Storm
  'フェイタルクロー', // Dire Claw
  'ほうでん', // Discharge
  'ピヨピヨパンチ', // Dizzy Punch
  'ダブルパンツァー', // Double Iron Bash
  'りゅうのいぶき', // Dragon Breath
  'ドラゴンダイブ', // Dragon Rush
  'ドラムアタック', // Drum Beating
  'ばくれつパンチ', // Dynamic Punch
  'だいちのちから', // Earth Power
  'ぶきみなじゅもん', // Eerie Spell
  'エレキネット', // Electroweb
  'ひのこ', // Ember
  'エナジーボール', // Energy Ball
  'オーラウイング', // Esper Wing
  'じんつうりき', // Extrasensory
  'ねこだまし', // Fake Out
  'ほのおのまい', // Fiery Dance
  'もえあがるいかり', // Fiery Wrath
  'だいもんじ', // Fire Blast
  'ほのおのキバ', // Fire Fang
  'ほのおのムチ', // Fire Lash
  'ほのおのパンチ', // Fire Punch
  'ニトロチャージ', // Flame Charge
  'かえんほうしゃ', // Flamethrower
  'かえんぐるま', // Flame Wheel
  'フレアドライブ', // Flare Blitz
  'ラスターカノン', // Flash Cannon
  'ふわふわフォール', // Floaty Fall
  'きあいだま', // Focus Blast
  'はっけい', // Force Palm
  'フリーズドライ', // Freeze-Dry
  'フリーズボルト', // Freeze Shock
  'いてつくしせん', // Freezing Glare
  'こごえるせかい', // Glaciate
  'Ｇのちから', // Grav Apple
  'ダストシュート', // Gunk Shot
  'ずつき', // Headbutt
  'ハートスタンプ', // Heart Stamp
  'ねっぷう', // Heat Wave
  'ぼうふう', // Hurricane
  'ひっさつまえば', // Hyper Fang
  'れいとうビーム', // Ice Beam
  'コールドフレア', // Ice Burn
  'こおりのキバ', // Ice Fang
  'れいとうパンチ', // Ice Punch
  'つららおとし', // Icicle Crash
  'こごえるかぜ', // Icy Wind
  'ひゃっきやこう', // Infernal Parade
  'れんごく', // Inferno
  'アイアンヘッド', // Iron Head
  'アイアンテール', // Iron Tail
  'ふんえん', // Lava Plume
  'グラスミキサー', // Leaf Tornado
  'したでなめる', // Lick
  'アクアブレイク', // Liquidation
  'ローキック', // Low Sweep
  'ルミナコリジョン', // Lumina Crash
  'とびかかる', // Lunge
  'ラスターパージ', // Luster Purge
  'マジカルアクセル', // Magical Torque
  'じゃどくのくさり', // Malignant Chain
  'シャカシャカほう', // Matcha Gotcha
  'メタルクロー', // Metal Claw
  'コメットパンチ', // Meteor Mash
  'ミラーショット', // Mirror Shot
  'ミストボール', // Mist Ball
  'ムーンフォース', // Moonblast
  'キラースピン', // Mortal Spin
  'ひょうざんおろし', // Mountain Gale
  'どろばくだん', // Mud Bomb
  'だくりゅう', // Muddy Water
  'マッドショット', // Mud Shot
  'どろかけ', // Mud-Slap
  'マジカルフレイム', // Mystical Fire
  'しんぴのちから', // Mystical Power
  'ニードルアーム', // Needle Arm
  'ナイトバースト', // Night Daze
  'ポイズンアクセル', // Noxious Torque
  'ほっぺすりすり', // Nuzzle
  'オクタンほう', // Octazooka
  'あやしいかぜ', // Ominous Wind
  'じゃれつく', // Play Rough
  'どくどくのキバ', // Poison Fang
  'どくづき', // Poison Jab
  'どくばり', // Poison Sting
  'ポイズンテール', // Poison Tail
  'とびつく', // Pounce
  'こなゆき', // Powder Snow
  'グロウパンチ', // Power-Up Punch
  'サイケこうせん', // Psybeam
  'サイコキネシス', // Psychic
  'サイコノイズ', // Psychic Noise
  'バリアーラッシュ', // Psyshield Bash
  'かえんボール', // Pyro Ball
  'こうそくスピン', // Rapid Spin
  'シェルブレード', // Razor Shell
  'いにしえのうた', // Relic Song
  'ロッククライム', // Rock Climb
  'いわなだれ', // Rock Slide
  'いわくだき', // Rock Smash
  'がんせきふうじ', // Rock Tomb
  'まわしげり', // Rolling Kick
  'せいなるほのお', // Sacred Fire
  'しおづけ', // Salt Cure
  'ねっさのあらし', // Sandsear Storm
  'ねっとう', // Scald
  'ねっさのだいち', // Scorching Sands
  'かえんだん', // Searing Shot
  'ひみつのちから', // Secret Power
  'シードフレア', // Seed Flare
  'シャドーボール', // Shadow Ball
  'シャドーボーン', // Shadow Bone
  'シェルアームズ', // Shell Side Arm
  'シグナルビーム', // Signal Beam
  'ぎんいろのかぜ', // Silver Wind
  'めらめらバーン', // Sizzly Slide
  'はいよるいちげき', // Skitter Smack
  'ゴッドバード', // Sky Attack
  'ヘドロこうげき', // Sludge
  'ヘドロばくだん', // Sludge Bomb
  'ヘドロウェーブ', // Sludge Wave
  'スモッグ', // Smog
  'バークアウト', // Snarl
  'いびき', // Snore
  'スパーク', // Spark
  'うたかたのアリア', // Sparkling Aria
  'ソウルクラッシュ', // Spirit Break
  'かげぬい', // Spirit Shackle
  'ざぶざぶサーフ', // Splishy Splash
  'はるのあらし', // Springtide Storm
  'スチームバースト', // Steam Eruption
  'ハードローラー', // Steamroller
  'はがねのつばさ', // Steel Wing
  'ふみつけ', // Stomp
  'がんせきアックス', // Stone Axe
  'ワンダースチーム', // Strange Steam
  'むしのていこう', // Struggle Bug
  'みずあめボム', // Syrup Bomb
  'じごくづき', // Throat Chop
  'かみなり', // Thunder
  '１０まんボルト', // Thunderbolt
  'かみなりのキバ', // Thunder Fang
  'らいめいげり', // Thunderous Kick
  'かみなりパンチ', // Thunder Punch
  'でんきショック', // Thunder Shock
  'フレアソング', // Torch Song
  'くさわけ', // Trailblaze
  'トライアタック', // Tri Attack
  '３ぼんのや', // Triple Arrows
  'トロピカルキック', // Trop Kick
  'ダブルニードル', // Twineedle
  'たつまき', // Twister
  'はやてがえし', // Upper Hand
  'ボルテッカー', // Volt Tackle
  'たきのぼり', // Waterfall
  'みずのはどう', // Water Pulse
  'ダークアクセル', // Wicked Torque
  'かみなりあらし', // Wildbolt Storm
  'でんじほう', // Zap Cannon
  'しねんのずつき', // Zen Headbutt
  'びりびりちくちく', // Zing Zap
  'ばちばちアクセル', // Zippy Zap
]);
