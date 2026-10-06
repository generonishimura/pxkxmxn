import type { MoveBehavior } from './move-behaviors';

/**
 * 技名（DB の name = PokeAPI ja-Hrkt）ごとの、エンジンが使う技の性質の表
 *
 * Pokemon Showdown（data/moves.ts、第9世代）の flags と一部の項目を、PokeAPI の技番号で
 * 日本語名に対応付けて作成した。技フラグ表（move-flag-table.ts）とは別の表にしている
 * - flags: snatch / dance / bypasssub / charge / recharge / failcopycat / failencore / failinstruct /
 *   failmefirst / failmimic / noassist / nosketch / nosleeptalk / mirror / cantusetwice /
 *   mustpressure / futuremove / reflectable / gravity / defrost
 * - metronome: flags.metronome を持ち、第9世代で使える技（isNonstandard がない、または Unobtainable）
 * - lockedMove: self.volatileStatus が lockedmove の技（あばれる・げきりんなど）
 * - sleepUsable: ねむっていても出せる技（いびき・ねごと）
 *
 * 追加方法: `['<DBの技名>', ['charge', 'mirror']],` の形で1行追加する（英語名はコメントに書く）。
 */
export const MOVE_BEHAVIOR_TABLE: ReadonlyArray<readonly [string, readonly MoveBehavior[]]> = [
  ['はたく', ['mirror', 'metronome']], // Pound
  ['からてチョップ', ['mirror']], // Karate Chop
  ['おうふくビンタ', ['mirror']], // Double Slap
  ['れんぞくパンチ', ['mirror']], // Comet Punch
  ['メガトンパンチ', ['mirror', 'metronome']], // Mega Punch
  ['ネコにこばん', ['mirror', 'metronome']], // Pay Day
  ['ほのおのパンチ', ['mirror', 'metronome']], // Fire Punch
  ['れいとうパンチ', ['mirror', 'metronome']], // Ice Punch
  ['かみなりパンチ', ['mirror', 'metronome']], // Thunder Punch
  ['ひっかく', ['mirror', 'metronome']], // Scratch
  ['はさむ', ['mirror', 'metronome']], // Vise Grip
  ['ハサミギロチン', ['mirror', 'metronome']], // Guillotine
  ['かまいたち', ['charge', 'failInstruct', 'noSleepTalk', 'mirror']], // Razor Wind
  ['つるぎのまい', ['snatch', 'dance', 'metronome']], // Swords Dance
  ['いあいぎり', ['mirror', 'metronome']], // Cut
  ['かぜおこし', ['mirror', 'metronome']], // Gust
  ['つばさでうつ', ['mirror', 'metronome']], // Wing Attack
  [
    'ふきとばし',
    ['bypassSubstitute', 'failCopycat', 'noAssist', 'mirror', 'reflectable', 'metronome'],
  ], // Whirlwind
  [
    'そらをとぶ',
    ['charge', 'failInstruct', 'noAssist', 'noSleepTalk', 'mirror', 'gravity', 'metronome'],
  ], // Fly
  ['しめつける', ['mirror', 'metronome']], // Bind
  ['たたきつける', ['mirror', 'metronome']], // Slam
  ['つるのムチ', ['mirror', 'metronome']], // Vine Whip
  ['ふみつけ', ['mirror', 'metronome']], // Stomp
  ['にどげり', ['mirror', 'metronome']], // Double Kick
  ['メガトンキック', ['mirror', 'metronome']], // Mega Kick
  ['とびげり', ['mirror', 'gravity']], // Jump Kick
  ['まわしげり', ['mirror']], // Rolling Kick
  ['すなかけ', ['mirror', 'reflectable', 'metronome']], // Sand Attack
  ['ずつき', ['mirror', 'metronome']], // Headbutt
  ['つのでつく', ['mirror', 'metronome']], // Horn Attack
  ['みだれづき', ['mirror', 'metronome']], // Fury Attack
  ['つのドリル', ['mirror', 'metronome']], // Horn Drill
  ['たいあたり', ['mirror', 'metronome']], // Tackle
  ['のしかかり', ['mirror', 'metronome']], // Body Slam
  ['まきつく', ['mirror', 'metronome']], // Wrap
  ['とっしん', ['mirror', 'metronome']], // Take Down
  ['あばれる', ['failInstruct', 'mirror', 'metronome', 'lockedMove']], // Thrash
  ['すてみタックル', ['mirror', 'metronome']], // Double-Edge
  ['しっぽをふる', ['mirror', 'reflectable', 'metronome']], // Tail Whip
  ['どくばり', ['mirror', 'metronome']], // Poison Sting
  ['ダブルニードル', ['mirror']], // Twineedle
  ['ミサイルばり', ['mirror', 'metronome']], // Pin Missile
  ['にらみつける', ['mirror', 'reflectable', 'metronome']], // Leer
  ['かみつく', ['mirror', 'metronome']], // Bite
  ['なきごえ', ['bypassSubstitute', 'mirror', 'reflectable', 'metronome']], // Growl
  ['ほえる', ['bypassSubstitute', 'failCopycat', 'noAssist', 'mirror', 'reflectable', 'metronome']], // Roar
  ['うたう', ['bypassSubstitute', 'mirror', 'reflectable', 'metronome']], // Sing
  ['ちょうおんぱ', ['bypassSubstitute', 'mirror', 'reflectable', 'metronome']], // Supersonic
  ['ソニックブーム', ['mirror']], // Sonic Boom
  ['かなしばり', ['bypassSubstitute', 'mirror', 'reflectable', 'metronome']], // Disable
  ['ようかいえき', ['mirror', 'metronome']], // Acid
  ['ひのこ', ['mirror', 'metronome']], // Ember
  ['かえんほうしゃ', ['mirror', 'metronome']], // Flamethrower
  ['しろいきり', ['snatch', 'metronome']], // Mist
  ['みずでっぽう', ['mirror', 'metronome']], // Water Gun
  ['ハイドロポンプ', ['mirror', 'metronome']], // Hydro Pump
  ['なみのり', ['mirror', 'metronome']], // Surf
  ['れいとうビーム', ['mirror', 'metronome']], // Ice Beam
  ['ふぶき', ['mirror', 'metronome']], // Blizzard
  ['サイケこうせん', ['mirror', 'metronome']], // Psybeam
  ['バブルこうせん', ['mirror', 'metronome']], // Bubble Beam
  ['オーロラビーム', ['mirror', 'metronome']], // Aurora Beam
  ['はかいこうせん', ['recharge', 'mirror', 'metronome']], // Hyper Beam
  ['つつく', ['mirror', 'metronome']], // Peck
  ['ドリルくちばし', ['mirror', 'metronome']], // Drill Peck
  ['じごくぐるま', ['mirror']], // Submission
  ['けたぐり', ['mirror', 'metronome']], // Low Kick
  ['カウンター', ['failCopycat', 'failMeFirst', 'noAssist']], // Counter
  ['ちきゅうなげ', ['mirror', 'metronome']], // Seismic Toss
  ['かいりき', ['mirror', 'metronome']], // Strength
  ['すいとる', ['mirror', 'metronome']], // Absorb
  ['メガドレイン', ['mirror', 'metronome']], // Mega Drain
  ['やどりぎのタネ', ['mirror', 'reflectable', 'metronome']], // Leech Seed
  ['せいちょう', ['snatch', 'metronome']], // Growth
  ['はっぱカッター', ['mirror', 'metronome']], // Razor Leaf
  ['ソーラービーム', ['charge', 'failInstruct', 'noSleepTalk', 'mirror', 'metronome']], // Solar Beam
  ['どくのこな', ['mirror', 'reflectable', 'metronome']], // Poison Powder
  ['しびれごな', ['mirror', 'reflectable', 'metronome']], // Stun Spore
  ['ねむりごな', ['mirror', 'reflectable', 'metronome']], // Sleep Powder
  ['はなびらのまい', ['dance', 'failInstruct', 'mirror', 'metronome', 'lockedMove']], // Petal Dance
  ['いとをはく', ['mirror', 'reflectable', 'metronome']], // String Shot
  ['りゅうのいかり', ['mirror']], // Dragon Rage
  ['ほのおのうず', ['mirror', 'metronome']], // Fire Spin
  ['でんきショック', ['mirror', 'metronome']], // Thunder Shock
  ['１０まんボルト', ['mirror', 'metronome']], // Thunderbolt
  ['でんじは', ['mirror', 'reflectable', 'metronome']], // Thunder Wave
  ['かみなり', ['mirror', 'metronome']], // Thunder
  ['いわおとし', ['mirror', 'metronome']], // Rock Throw
  ['じしん', ['mirror', 'metronome']], // Earthquake
  ['じわれ', ['mirror', 'metronome']], // Fissure
  ['あなをほる', ['charge', 'failInstruct', 'noAssist', 'noSleepTalk', 'mirror', 'metronome']], // Dig
  ['どくどく', ['mirror', 'reflectable', 'metronome']], // Toxic
  ['ねんりき', ['mirror', 'metronome']], // Confusion
  ['サイコキネシス', ['mirror', 'metronome']], // Psychic
  ['さいみんじゅつ', ['mirror', 'reflectable', 'metronome']], // Hypnosis
  ['ヨガのポーズ', ['snatch']], // Meditate
  ['こうそくいどう', ['snatch', 'metronome']], // Agility
  ['でんこうせっか', ['mirror', 'metronome']], // Quick Attack
  ['いかり', ['mirror']], // Rage
  ['テレポート', ['metronome']], // Teleport
  ['ナイトヘッド', ['mirror', 'metronome']], // Night Shade
  [
    'ものまね',
    [
      'bypassSubstitute',
      'failCopycat',
      'failEncore',
      'failInstruct',
      'failMimic',
      'noAssist',
      'noSleepTalk',
    ],
  ], // Mimic
  ['いやなおと', ['bypassSubstitute', 'mirror', 'reflectable', 'metronome']], // Screech
  ['かげぶんしん', ['snatch', 'metronome']], // Double Team
  ['じこさいせい', ['snatch', 'metronome']], // Recover
  ['かたくなる', ['snatch', 'metronome']], // Harden
  ['ちいさくなる', ['snatch', 'metronome']], // Minimize
  ['えんまく', ['mirror', 'reflectable', 'metronome']], // Smokescreen
  ['あやしいひかり', ['mirror', 'reflectable', 'metronome']], // Confuse Ray
  ['からにこもる', ['snatch', 'metronome']], // Withdraw
  ['まるくなる', ['snatch', 'metronome']], // Defense Curl
  ['バリアー', ['snatch']], // Barrier
  ['ひかりのかべ', ['snatch', 'metronome']], // Light Screen
  ['くろいきり', ['bypassSubstitute', 'metronome']], // Haze
  ['リフレクター', ['snatch', 'metronome']], // Reflect
  ['きあいだめ', ['snatch', 'metronome']], // Focus Energy
  ['がまん', ['failInstruct', 'noSleepTalk']], // Bide
  [
    'ゆびをふる',
    ['failCopycat', 'failEncore', 'failInstruct', 'failMimic', 'noAssist', 'noSleepTalk'],
  ], // Metronome
  // bypassSubstitute は Showdown の flags にはない。本家はみがわりの判定（onTryPrimaryHit）より前に
  // onTryHit でまねした技を出すので、その代わりに付けている。まねした技は callMove で自分のみがわりの判定を受ける
  [
    'オウムがえし',
    [
      'bypassSubstitute',
      'failCopycat',
      'failEncore',
      'failInstruct',
      'failMimic',
      'noAssist',
      'noSleepTalk',
    ],
  ], // Mirror Move
  ['じばく', ['mirror', 'metronome']], // Self-Destruct
  ['タマゴばくだん', ['mirror']], // Egg Bomb
  ['したでなめる', ['mirror', 'metronome']], // Lick
  ['スモッグ', ['mirror', 'metronome']], // Smog
  ['ヘドロこうげき', ['mirror', 'metronome']], // Sludge
  ['ホネこんぼう', ['mirror']], // Bone Club
  ['だいもんじ', ['mirror', 'metronome']], // Fire Blast
  ['たきのぼり', ['mirror', 'metronome']], // Waterfall
  ['からではさむ', ['mirror']], // Clamp
  ['スピードスター', ['mirror', 'metronome']], // Swift
  ['ロケットずつき', ['charge', 'failInstruct', 'noSleepTalk', 'mirror']], // Skull Bash
  ['とげキャノン', ['mirror']], // Spike Cannon
  ['からみつく', ['mirror']], // Constrict
  ['ドわすれ', ['snatch', 'metronome']], // Amnesia
  ['スプーンまげ', ['mirror', 'reflectable']], // Kinesis
  ['タマゴうみ', ['snatch', 'metronome']], // Soft-Boiled
  ['とびひざげり', ['mirror', 'gravity', 'metronome']], // High Jump Kick
  ['へびにらみ', ['mirror', 'reflectable', 'metronome']], // Glare
  ['ゆめくい', ['mirror', 'metronome']], // Dream Eater
  ['どくガス', ['mirror', 'reflectable', 'metronome']], // Poison Gas
  ['たまなげ', ['mirror']], // Barrage
  ['きゅうけつ', ['mirror', 'metronome']], // Leech Life
  ['あくまのキッス', ['mirror', 'reflectable']], // Lovely Kiss
  ['ゴッドバード', ['charge', 'failInstruct', 'noSleepTalk', 'mirror', 'metronome']], // Sky Attack
  ['へんしん', ['failCopycat', 'failEncore', 'failInstruct', 'failMimic', 'noAssist']], // Transform
  ['あわ', ['mirror']], // Bubble
  ['ピヨピヨパンチ', ['mirror']], // Dizzy Punch
  ['キノコのほうし', ['mirror', 'reflectable', 'metronome']], // Spore
  ['フラッシュ', ['mirror', 'reflectable']], // Flash
  ['サイコウェーブ', ['mirror']], // Psywave
  ['はねる', ['gravity', 'metronome']], // Splash
  ['とける', ['snatch', 'metronome']], // Acid Armor
  ['クラブハンマー', ['mirror', 'metronome']], // Crabhammer
  ['だいばくはつ', ['mirror', 'metronome']], // Explosion
  ['みだれひっかき', ['mirror', 'metronome']], // Fury Swipes
  ['ホネブーメラン', ['mirror']], // Bonemerang
  ['ねむる', ['snatch', 'metronome']], // Rest
  ['いわなだれ', ['mirror', 'metronome']], // Rock Slide
  ['ひっさつまえば', ['mirror']], // Hyper Fang
  ['かくばる', ['snatch']], // Sharpen
  ['テクスチャー', ['snatch', 'metronome']], // Conversion
  ['トライアタック', ['mirror', 'metronome']], // Tri Attack
  ['いかりのまえば', ['mirror', 'metronome']], // Super Fang
  ['きりさく', ['mirror', 'metronome']], // Slash
  ['みがわり', ['snatch', 'metronome']], // Substitute
  [
    'わるあがき',
    [
      'failCopycat',
      'failEncore',
      'failInstruct',
      'failMeFirst',
      'failMimic',
      'noAssist',
      'noSketch',
      'noSleepTalk',
    ],
  ], // Struggle
  [
    'スケッチ',
    [
      'bypassSubstitute',
      'failCopycat',
      'failEncore',
      'failInstruct',
      'failMimic',
      'noAssist',
      'noSketch',
      'noSleepTalk',
    ],
  ], // Sketch
  ['トリプルキック', ['mirror', 'metronome']], // Triple Kick
  ['どろぼう', ['failCopycat', 'failMeFirst', 'noAssist', 'mirror']], // Thief
  ['クモのす', ['mirror', 'reflectable']], // Spider Web
  ['こころのめ', ['mirror']], // Mind Reader
  ['あくむ', ['mirror']], // Nightmare
  ['かえんぐるま', ['mirror', 'defrost', 'metronome']], // Flame Wheel
  ['いびき', ['bypassSubstitute', 'mirror', 'sleepUsable']], // Snore
  ['のろい', ['bypassSubstitute', 'metronome']], // Curse
  ['じたばた', ['mirror', 'metronome']], // Flail
  ['テクスチャー２', ['bypassSubstitute', 'metronome']], // Conversion 2
  ['エアロブラスト', ['mirror', 'metronome']], // Aeroblast
  ['わたほうし', ['mirror', 'reflectable', 'metronome']], // Cotton Spore
  ['きしかいせい', ['mirror', 'metronome']], // Reversal
  ['うらみ', ['bypassSubstitute', 'mirror', 'reflectable', 'metronome']], // Spite
  ['こなゆき', ['mirror', 'metronome']], // Powder Snow
  ['まもる', ['failCopycat', 'noAssist']], // Protect
  ['マッハパンチ', ['mirror', 'metronome']], // Mach Punch
  ['こわいかお', ['mirror', 'reflectable', 'metronome']], // Scary Face
  ['だましうち', ['mirror']], // Feint Attack
  ['てんしのキッス', ['mirror', 'reflectable', 'metronome']], // Sweet Kiss
  ['はらだいこ', ['snatch', 'metronome']], // Belly Drum
  ['ヘドロばくだん', ['mirror', 'metronome']], // Sludge Bomb
  ['どろかけ', ['mirror', 'metronome']], // Mud-Slap
  ['オクタンほう', ['mirror']], // Octazooka
  ['まきびし', ['mustPressure', 'reflectable', 'metronome']], // Spikes
  ['でんじほう', ['mirror', 'metronome']], // Zap Cannon
  ['みやぶる', ['bypassSubstitute', 'mirror', 'reflectable']], // Foresight
  ['みちづれ', ['bypassSubstitute', 'failCopycat', 'noAssist']], // Destiny Bond
  ['ほろびのうた', ['bypassSubstitute', 'metronome']], // Perish Song
  ['こごえるかぜ', ['mirror', 'metronome']], // Icy Wind
  ['みきり', ['failCopycat', 'noAssist']], // Detect
  ['ボーンラッシュ', ['mirror', 'metronome']], // Bone Rush
  ['ロックオン', ['mirror', 'metronome']], // Lock-On
  ['げきりん', ['failInstruct', 'mirror', 'metronome', 'lockedMove']], // Outrage
  ['すなあらし', ['metronome']], // Sandstorm
  ['ギガドレイン', ['mirror', 'metronome']], // Giga Drain
  ['こらえる', ['failCopycat', 'noAssist']], // Endure
  ['あまえる', ['mirror', 'reflectable', 'metronome']], // Charm
  ['ころがる', ['failInstruct', 'mirror', 'metronome']], // Rollout
  ['みねうち', ['mirror', 'metronome']], // False Swipe
  ['いばる', ['mirror', 'reflectable', 'metronome']], // Swagger
  ['ミルクのみ', ['snatch', 'metronome']], // Milk Drink
  ['スパーク', ['mirror', 'metronome']], // Spark
  ['れんぞくぎり', ['mirror', 'metronome']], // Fury Cutter
  ['はがねのつばさ', ['mirror', 'metronome']], // Steel Wing
  ['くろいまなざし', ['mirror', 'reflectable', 'metronome']], // Mean Look
  ['メロメロ', ['bypassSubstitute', 'mirror', 'reflectable', 'metronome']], // Attract
  [
    'ねごと',
    [
      'failCopycat',
      'failEncore',
      'failInstruct',
      'failMimic',
      'noAssist',
      'noSleepTalk',
      'sleepUsable',
    ],
  ], // Sleep Talk
  ['いやしのすず', ['snatch', 'bypassSubstitute', 'metronome']], // Heal Bell
  ['おんがえし', ['mirror']], // Return
  ['プレゼント', ['mirror', 'metronome']], // Present
  ['やつあたり', ['mirror']], // Frustration
  ['しんぴのまもり', ['snatch', 'metronome']], // Safeguard
  ['いたみわけ', ['mirror', 'metronome']], // Pain Split
  ['せいなるほのお', ['mirror', 'defrost', 'metronome']], // Sacred Fire
  ['マグニチュード', ['mirror']], // Magnitude
  ['ばくれつパンチ', ['mirror', 'metronome']], // Dynamic Punch
  ['メガホーン', ['mirror', 'metronome']], // Megahorn
  ['りゅうのいぶき', ['mirror', 'metronome']], // Dragon Breath
  ['バトンタッチ', ['metronome']], // Baton Pass
  ['アンコール', ['bypassSubstitute', 'failEncore', 'mirror', 'reflectable', 'metronome']], // Encore
  ['おいうち', ['mirror']], // Pursuit
  ['こうそくスピン', ['mirror', 'metronome']], // Rapid Spin
  ['あまいかおり', ['mirror', 'reflectable', 'metronome']], // Sweet Scent
  ['アイアンテール', ['mirror', 'metronome']], // Iron Tail
  ['メタルクロー', ['mirror', 'metronome']], // Metal Claw
  ['あてみなげ', ['mirror']], // Vital Throw
  ['あさのひざし', ['snatch', 'metronome']], // Morning Sun
  ['こうごうせい', ['snatch', 'metronome']], // Synthesis
  ['つきのひかり', ['snatch', 'metronome']], // Moonlight
  ['めざめるパワー', ['mirror']], // Hidden Power
  ['めざめるパワー', ['mirror']], // Hidden Power Bug
  ['めざめるパワー', ['mirror']], // Hidden Power Dark
  ['めざめるパワー', ['mirror']], // Hidden Power Dragon
  ['めざめるパワー', ['mirror']], // Hidden Power Electric
  ['めざめるパワー', ['mirror']], // Hidden Power Fighting
  ['めざめるパワー', ['mirror']], // Hidden Power Fire
  ['めざめるパワー', ['mirror']], // Hidden Power Flying
  ['めざめるパワー', ['mirror']], // Hidden Power Ghost
  ['めざめるパワー', ['mirror']], // Hidden Power Grass
  ['めざめるパワー', ['mirror']], // Hidden Power Ground
  ['めざめるパワー', ['mirror']], // Hidden Power Ice
  ['めざめるパワー', ['mirror']], // Hidden Power Poison
  ['めざめるパワー', ['mirror']], // Hidden Power Psychic
  ['めざめるパワー', ['mirror']], // Hidden Power Rock
  ['めざめるパワー', ['mirror']], // Hidden Power Steel
  ['めざめるパワー', ['mirror']], // Hidden Power Water
  ['クロスチョップ', ['mirror', 'metronome']], // Cross Chop
  ['たつまき', ['mirror', 'metronome']], // Twister
  ['あまごい', ['metronome']], // Rain Dance
  ['にほんばれ', ['metronome']], // Sunny Day
  ['かみくだく', ['mirror', 'metronome']], // Crunch
  ['ミラーコート', ['failMeFirst', 'noAssist']], // Mirror Coat
  ['じこあんじ', ['bypassSubstitute', 'metronome']], // Psych Up
  ['しんそく', ['mirror', 'metronome']], // Extreme Speed
  ['げんしのちから', ['mirror', 'metronome']], // Ancient Power
  ['シャドーボール', ['mirror', 'metronome']], // Shadow Ball
  ['みらいよち', ['futureMove', 'metronome']], // Future Sight
  ['いわくだき', ['mirror', 'metronome']], // Rock Smash
  ['うずしお', ['mirror', 'metronome']], // Whirlpool
  ['ふくろだたき', ['mirror', 'metronome']], // Beat Up
  ['ねこだまし', ['mirror', 'metronome']], // Fake Out
  ['さわぐ', ['bypassSubstitute', 'failInstruct', 'noSleepTalk', 'mirror', 'metronome']], // Uproar
  ['たくわえる', ['snatch', 'metronome']], // Stockpile
  ['はきだす', ['metronome']], // Spit Up
  ['のみこむ', ['snatch', 'metronome']], // Swallow
  ['ねっぷう', ['mirror', 'metronome']], // Heat Wave
  ['いちゃもん', ['bypassSubstitute', 'mirror', 'reflectable', 'metronome']], // Torment
  ['おだてる', ['mirror', 'reflectable', 'metronome']], // Flatter
  ['おにび', ['mirror', 'reflectable', 'metronome']], // Will-O-Wisp
  ['おきみやげ', ['mirror', 'metronome']], // Memento
  ['からげんき', ['mirror', 'metronome']], // Facade
  ['きあいパンチ', ['failCopycat', 'failInstruct', 'failMeFirst', 'noAssist', 'noSleepTalk']], // Focus Punch
  ['きつけ', ['mirror']], // Smelling Salts
  ['このゆびとまれ', ['failCopycat', 'noAssist']], // Follow Me
  [
    'しぜんのちから',
    ['failCopycat', 'failEncore', 'failInstruct', 'failMimic', 'noAssist', 'noSleepTalk'],
  ], // Nature Power
  ['じゅうでん', ['snatch', 'metronome']], // Charge
  ['ちょうはつ', ['bypassSubstitute', 'mirror', 'reflectable', 'metronome']], // Taunt
  ['てだすけ', ['bypassSubstitute', 'failCopycat', 'noAssist']], // Helping Hand
  ['トリック', ['failCopycat', 'noAssist', 'mirror']], // Trick
  ['なりきり', ['bypassSubstitute', 'metronome']], // Role Play
  ['ねがいごと', ['snatch', 'metronome']], // Wish
  [
    'ねこのて',
    ['failCopycat', 'failEncore', 'failInstruct', 'failMimic', 'noAssist', 'noSleepTalk'],
  ], // Assist
  ['ねをはる', ['snatch', 'metronome']], // Ingrain
  ['ばかぢから', ['mirror', 'metronome']], // Superpower
  ['リサイクル', ['snatch', 'metronome']], // Recycle
  ['リベンジ', ['mirror']], // Revenge
  ['かわらわり', ['mirror', 'metronome']], // Brick Break
  ['あくび', ['mirror', 'reflectable', 'metronome']], // Yawn
  ['はたきおとす', ['mirror', 'metronome']], // Knock Off
  ['がむしゃら', ['mirror', 'metronome']], // Endeavor
  ['ふんか', ['mirror', 'metronome']], // Eruption
  ['スキルスワップ', ['bypassSubstitute', 'mirror', 'metronome']], // Skill Swap
  ['ふういん', ['snatch', 'bypassSubstitute', 'mustPressure', 'metronome']], // Imprison
  ['リフレッシュ', ['snatch']], // Refresh
  ['おんねん', ['bypassSubstitute']], // Grudge
  ['よこどり', ['bypassSubstitute', 'failCopycat', 'noAssist', 'mustPressure']], // Snatch
  ['ひみつのちから', ['mirror']], // Secret Power
  ['ダイビング', ['charge', 'failInstruct', 'noAssist', 'noSleepTalk', 'mirror', 'metronome']], // Dive
  ['つっぱり', ['mirror', 'metronome']], // Arm Thrust
  ['ほごしょく', ['snatch']], // Camouflage
  ['ほたるび', ['snatch', 'metronome']], // Tail Glow
  ['ラスターパージ', ['mirror', 'metronome']], // Luster Purge
  ['ミストボール', ['mirror', 'metronome']], // Mist Ball
  ['フェザーダンス', ['dance', 'mirror', 'reflectable', 'metronome']], // Feather Dance
  ['フラフラダンス', ['dance', 'mirror', 'metronome']], // Teeter Dance
  ['ブレイズキック', ['mirror', 'metronome']], // Blaze Kick
  ['アイスボール', ['failInstruct', 'mirror']], // Ice Ball
  ['ニードルアーム', ['mirror']], // Needle Arm
  ['なまける', ['snatch', 'metronome']], // Slack Off
  ['ハイパーボイス', ['bypassSubstitute', 'mirror', 'metronome']], // Hyper Voice
  ['どくどくのキバ', ['mirror', 'metronome']], // Poison Fang
  ['ブレイククロー', ['mirror', 'metronome']], // Crush Claw
  ['ブラストバーン', ['recharge', 'mirror', 'metronome']], // Blast Burn
  ['ハイドロカノン', ['recharge', 'mirror', 'metronome']], // Hydro Cannon
  ['コメットパンチ', ['mirror', 'metronome']], // Meteor Mash
  ['おどろかす', ['mirror', 'metronome']], // Astonish
  ['ウェザーボール', ['mirror', 'metronome']], // Weather Ball
  ['アロマセラピー', ['snatch']], // Aromatherapy
  ['うそなき', ['mirror', 'reflectable', 'metronome']], // Fake Tears
  ['エアカッター', ['mirror', 'metronome']], // Air Cutter
  ['オーバーヒート', ['mirror', 'metronome']], // Overheat
  ['かぎわける', ['bypassSubstitute', 'mirror', 'reflectable']], // Odor Sleuth
  ['がんせきふうじ', ['mirror', 'metronome']], // Rock Tomb
  ['ぎんいろのかぜ', ['mirror']], // Silver Wind
  ['きんぞくおん', ['bypassSubstitute', 'mirror', 'reflectable', 'metronome']], // Metal Sound
  ['くさぶえ', ['bypassSubstitute', 'mirror', 'reflectable']], // Grass Whistle
  ['くすぐる', ['mirror', 'reflectable', 'metronome']], // Tickle
  ['コスモパワー', ['snatch', 'metronome']], // Cosmic Power
  ['しおふき', ['mirror', 'metronome']], // Water Spout
  ['シグナルビーム', ['mirror']], // Signal Beam
  ['シャドーパンチ', ['mirror', 'metronome']], // Shadow Punch
  ['じんつうりき', ['mirror', 'metronome']], // Extrasensory
  ['スカイアッパー', ['mirror']], // Sky Uppercut
  ['すなじごく', ['mirror', 'metronome']], // Sand Tomb
  ['ぜったいれいど', ['mirror', 'metronome']], // Sheer Cold
  ['だくりゅう', ['mirror', 'metronome']], // Muddy Water
  ['タネマシンガン', ['mirror', 'metronome']], // Bullet Seed
  ['つばめがえし', ['mirror', 'metronome']], // Aerial Ace
  ['つららばり', ['mirror', 'metronome']], // Icicle Spear
  ['てっぺき', ['snatch', 'metronome']], // Iron Defense
  ['とおせんぼう', ['mirror', 'reflectable', 'metronome']], // Block
  ['とおぼえ', ['snatch', 'metronome']], // Howl
  ['ドラゴンクロー', ['mirror', 'metronome']], // Dragon Claw
  ['ハードプラント', ['recharge', 'mirror', 'metronome']], // Frenzy Plant
  ['ビルドアップ', ['snatch', 'metronome']], // Bulk Up
  [
    'とびはねる',
    ['charge', 'failInstruct', 'noAssist', 'noSleepTalk', 'mirror', 'gravity', 'metronome'],
  ], // Bounce
  ['マッドショット', ['mirror', 'metronome']], // Mud Shot
  ['ポイズンテール', ['mirror', 'metronome']], // Poison Tail
  ['ほしがる', ['failCopycat', 'failMeFirst', 'noAssist', 'mirror']], // Covet
  ['ボルテッカー', ['mirror', 'metronome']], // Volt Tackle
  ['マジカルリーフ', ['mirror', 'metronome']], // Magical Leaf
  ['めいそう', ['snatch', 'metronome']], // Calm Mind
  ['リーフブレード', ['mirror', 'metronome']], // Leaf Blade
  ['りゅうのまい', ['snatch', 'dance', 'metronome']], // Dragon Dance
  ['ロックブラスト', ['mirror', 'metronome']], // Rock Blast
  ['でんげきは', ['mirror', 'metronome']], // Shock Wave
  ['みずのはどう', ['mirror', 'metronome']], // Water Pulse
  ['はめつのねがい', ['futureMove', 'metronome']], // Doom Desire
  ['サイコブースト', ['mirror', 'metronome']], // Psycho Boost
  ['はねやすめ', ['snatch', 'metronome']], // Roost
  ['じゅうりょく', ['metronome']], // Gravity
  ['ミラクルアイ', ['bypassSubstitute', 'mirror', 'reflectable']], // Miracle Eye
  ['めざましビンタ', ['mirror']], // Wake-Up Slap
  ['アームハンマー', ['mirror', 'metronome']], // Hammer Arm
  ['ジャイロボール', ['mirror', 'metronome']], // Gyro Ball
  ['いやしのねがい', ['snatch', 'metronome']], // Healing Wish
  ['しおみず', ['mirror', 'metronome']], // Brine
  ['しぜんのめぐみ', ['mirror']], // Natural Gift
  ['フェイント', ['failCopycat', 'noAssist', 'mirror']], // Feint
  ['ついばむ', ['mirror', 'metronome']], // Pluck
  ['おいかぜ', ['snatch', 'metronome']], // Tailwind
  ['つぼをつく', ['metronome']], // Acupressure
  ['メタルバースト', ['failMeFirst', 'mirror', 'metronome']], // Metal Burst
  ['とんぼがえり', ['mirror', 'metronome']], // U-turn
  ['インファイト', ['mirror', 'metronome']], // Close Combat
  ['しっぺがえし', ['mirror', 'metronome']], // Payback
  ['ダメおし', ['mirror', 'metronome']], // Assurance
  ['さしおさえ', ['mirror', 'reflectable']], // Embargo
  ['なげつける', ['mirror', 'metronome']], // Fling
  ['サイコシフト', ['mirror']], // Psycho Shift
  ['きりふだ', ['mirror']], // Trump Card
  ['かいふくふうじ', ['mirror', 'reflectable']], // Heal Block
  ['しぼりとる', ['mirror']], // Wring Out
  ['パワートリック', ['snatch', 'metronome']], // Power Trick
  ['いえき', ['mirror', 'reflectable', 'metronome']], // Gastro Acid
  ['おまじない', ['snatch']], // Lucky Chant
  [
    'さきどり',
    [
      'bypassSubstitute',
      'failCopycat',
      'failEncore',
      'failInstruct',
      'failMeFirst',
      'failMimic',
      'noAssist',
      'noSleepTalk',
    ],
  ], // Me First
  [
    'まねっこ',
    ['failCopycat', 'failEncore', 'failInstruct', 'failMimic', 'noAssist', 'noSleepTalk'],
  ], // Copycat
  ['パワースワップ', ['bypassSubstitute', 'mirror', 'metronome']], // Power Swap
  ['ガードスワップ', ['bypassSubstitute', 'mirror', 'metronome']], // Guard Swap
  ['おしおき', ['mirror']], // Punishment
  ['とっておき', ['mirror', 'metronome']], // Last Resort
  ['なやみのタネ', ['mirror', 'reflectable', 'metronome']], // Worry Seed
  ['ふいうち', ['mirror', 'metronome']], // Sucker Punch
  ['どくびし', ['mustPressure', 'reflectable', 'metronome']], // Toxic Spikes
  ['ハートスワップ', ['bypassSubstitute', 'mirror', 'metronome']], // Heart Swap
  ['アクアリング', ['snatch', 'metronome']], // Aqua Ring
  ['でんじふゆう', ['snatch', 'gravity', 'metronome']], // Magnet Rise
  ['フレアドライブ', ['mirror', 'defrost', 'metronome']], // Flare Blitz
  ['はっけい', ['mirror', 'metronome']], // Force Palm
  ['はどうだん', ['mirror', 'metronome']], // Aura Sphere
  ['ロックカット', ['snatch', 'metronome']], // Rock Polish
  ['どくづき', ['mirror', 'metronome']], // Poison Jab
  ['あくのはどう', ['mirror', 'metronome']], // Dark Pulse
  ['つじぎり', ['mirror', 'metronome']], // Night Slash
  ['アクアテール', ['mirror', 'metronome']], // Aqua Tail
  ['タネばくだん', ['mirror', 'metronome']], // Seed Bomb
  ['エアスラッシュ', ['mirror', 'metronome']], // Air Slash
  ['シザークロス', ['mirror', 'metronome']], // X-Scissor
  ['むしのさざめき', ['bypassSubstitute', 'mirror', 'metronome']], // Bug Buzz
  ['りゅうのはどう', ['mirror', 'metronome']], // Dragon Pulse
  ['ドラゴンダイブ', ['mirror', 'metronome']], // Dragon Rush
  ['パワージェム', ['mirror', 'metronome']], // Power Gem
  ['ドレインパンチ', ['mirror', 'metronome']], // Drain Punch
  ['しんくうは', ['mirror', 'metronome']], // Vacuum Wave
  ['きあいだま', ['mirror', 'metronome']], // Focus Blast
  ['エナジーボール', ['mirror', 'metronome']], // Energy Ball
  ['ブレイブバード', ['mirror', 'metronome']], // Brave Bird
  ['だいちのちから', ['mirror', 'metronome']], // Earth Power
  ['すりかえ', ['failCopycat', 'noAssist', 'mirror']], // Switcheroo
  ['ギガインパクト', ['recharge', 'mirror', 'metronome']], // Giga Impact
  ['わるだくみ', ['snatch', 'metronome']], // Nasty Plot
  ['バレットパンチ', ['mirror', 'metronome']], // Bullet Punch
  ['ゆきなだれ', ['mirror', 'metronome']], // Avalanche
  ['こおりのつぶて', ['mirror', 'metronome']], // Ice Shard
  ['シャドークロー', ['mirror', 'metronome']], // Shadow Claw
  ['かみなりのキバ', ['mirror', 'metronome']], // Thunder Fang
  ['こおりのキバ', ['mirror', 'metronome']], // Ice Fang
  ['ほのおのキバ', ['mirror', 'metronome']], // Fire Fang
  ['かげうち', ['mirror', 'metronome']], // Shadow Sneak
  ['どろばくだん', ['mirror']], // Mud Bomb
  ['サイコカッター', ['mirror', 'metronome']], // Psycho Cut
  ['しねんのずつき', ['mirror', 'metronome']], // Zen Headbutt
  ['ミラーショット', ['mirror']], // Mirror Shot
  ['ラスターカノン', ['mirror', 'metronome']], // Flash Cannon
  ['ロッククライム', ['mirror']], // Rock Climb
  ['きりばらい', ['bypassSubstitute', 'mirror', 'reflectable', 'metronome']], // Defog
  ['トリックルーム', ['mirror', 'metronome']], // Trick Room
  ['りゅうせいぐん', ['mirror', 'metronome']], // Draco Meteor
  ['ほうでん', ['mirror', 'metronome']], // Discharge
  ['ふんえん', ['mirror', 'metronome']], // Lava Plume
  ['リーフストーム', ['mirror', 'metronome']], // Leaf Storm
  ['パワーウィップ', ['mirror', 'metronome']], // Power Whip
  ['がんせきほう', ['recharge', 'mirror', 'metronome']], // Rock Wrecker
  ['クロスポイズン', ['mirror', 'metronome']], // Cross Poison
  ['ダストシュート', ['mirror', 'metronome']], // Gunk Shot
  ['アイアンヘッド', ['mirror', 'metronome']], // Iron Head
  ['マグネットボム', ['mirror']], // Magnet Bomb
  ['ストーンエッジ', ['mirror', 'metronome']], // Stone Edge
  ['ゆうわく', ['mirror', 'reflectable']], // Captivate
  ['ステルスロック', ['mustPressure', 'reflectable', 'metronome']], // Stealth Rock
  ['くさむすび', ['mirror', 'metronome']], // Grass Knot
  [
    'おしゃべり',
    [
      'bypassSubstitute',
      'failCopycat',
      'failInstruct',
      'failMimic',
      'noAssist',
      'noSleepTalk',
      'mirror',
    ],
  ], // Chatter
  ['さばきのつぶて', ['mirror', 'metronome']], // Judgment
  ['むしくい', ['mirror', 'metronome']], // Bug Bite
  ['チャージビーム', ['mirror', 'metronome']], // Charge Beam
  ['ウッドハンマー', ['mirror', 'metronome']], // Wood Hammer
  ['アクアジェット', ['mirror', 'metronome']], // Aqua Jet
  ['こうげきしれい', ['mirror', 'metronome']], // Attack Order
  ['ぼうぎょしれい', ['snatch', 'metronome']], // Defend Order
  ['かいふくしれい', ['snatch']], // Heal Order
  ['もろはのずつき', ['mirror', 'metronome']], // Head Smash
  ['ダブルアタック', ['mirror', 'metronome']], // Double Hit
  ['ときのほうこう', ['recharge', 'mirror', 'metronome']], // Roar of Time
  ['あくうせつだん', ['mirror', 'metronome']], // Spacial Rend
  ['みかづきのまい', ['snatch', 'dance', 'metronome']], // Lunar Dance
  ['にぎりつぶす', ['mirror', 'metronome']], // Crush Grip
  ['マグマストーム', ['mirror', 'metronome']], // Magma Storm
  ['ダークホール', ['noSketch', 'mirror', 'reflectable', 'metronome']], // Dark Void
  ['シードフレア', ['mirror', 'metronome']], // Seed Flare
  ['あやしいかぜ', ['mirror']], // Ominous Wind
  ['シャドーダイブ', ['charge', 'failInstruct', 'noAssist', 'noSleepTalk', 'mirror', 'metronome']], // Shadow Force
  ['つめとぎ', ['snatch', 'metronome']], // Hone Claws
  ['ワイドガード', ['snatch']], // Wide Guard
  ['ガードシェア', ['metronome']], // Guard Split
  ['パワーシェア', ['metronome']], // Power Split
  ['ワンダールーム', ['mirror', 'metronome']], // Wonder Room
  ['サイコショック', ['mirror', 'metronome']], // Psyshock
  ['ベノムショック', ['mirror', 'metronome']], // Venoshock
  ['ボディパージ', ['snatch']], // Autotomize
  ['いかりのこな', ['failCopycat', 'noAssist']], // Rage Powder
  ['テレキネシス', ['mirror', 'reflectable', 'gravity']], // Telekinesis
  ['マジックルーム', ['mirror', 'metronome']], // Magic Room
  ['うちおとす', ['mirror', 'metronome']], // Smack Down
  ['やまあらし', ['mirror']], // Storm Throw
  ['はじけるほのお', ['mirror']], // Flame Burst
  ['ヘドロウェーブ', ['mirror', 'metronome']], // Sludge Wave
  ['ちょうのまい', ['snatch', 'dance', 'metronome']], // Quiver Dance
  ['ヘビーボンバー', ['mirror', 'metronome']], // Heavy Slam
  ['シンクロノイズ', ['mirror']], // Synchronoise
  ['エレキボール', ['mirror', 'metronome']], // Electro Ball
  ['みずびたし', ['mirror', 'reflectable', 'metronome']], // Soak
  ['ニトロチャージ', ['mirror', 'metronome']], // Flame Charge
  ['とぐろをまく', ['snatch', 'metronome']], // Coil
  ['ローキック', ['mirror', 'metronome']], // Low Sweep
  ['アシッドボム', ['mirror', 'metronome']], // Acid Spray
  ['イカサマ', ['mirror', 'metronome']], // Foul Play
  ['シンプルビーム', ['mirror', 'reflectable', 'metronome']], // Simple Beam
  ['なかまづくり', ['mirror', 'reflectable', 'metronome']], // Entrainment
  ['おさきにどうぞ', ['bypassSubstitute']], // After You
  ['りんしょう', ['bypassSubstitute', 'mirror', 'metronome']], // Round
  ['エコーボイス', ['bypassSubstitute', 'mirror', 'metronome']], // Echoed Voice
  ['なしくずし', ['mirror']], // Chip Away
  ['クリアスモッグ', ['mirror', 'metronome']], // Clear Smog
  ['アシストパワー', ['mirror', 'metronome']], // Stored Power
  ['ファストガード', ['snatch']], // Quick Guard
  ['サイドチェンジ', ['metronome']], // Ally Switch
  ['ねっとう', ['mirror', 'defrost', 'metronome']], // Scald
  ['からをやぶる', ['snatch', 'metronome']], // Shell Smash
  ['いやしのはどう', ['reflectable', 'metronome']], // Heal Pulse
  ['たたりめ', ['mirror', 'metronome']], // Hex
  ['フリーフォール', ['charge', 'failInstruct', 'noAssist', 'noSleepTalk', 'mirror', 'gravity']], // Sky Drop
  ['ギアチェンジ', ['snatch', 'metronome']], // Shift Gear
  ['ともえなげ', ['failCopycat', 'noAssist', 'mirror', 'metronome']], // Circle Throw
  ['やきつくす', ['mirror', 'metronome']], // Incinerate
  ['さきおくり', ['mirror']], // Quash
  ['アクロバット', ['mirror', 'metronome']], // Acrobatics
  ['ミラータイプ', ['bypassSubstitute', 'metronome']], // Reflect Type
  ['かたきうち', ['mirror', 'metronome']], // Retaliate
  ['いのちがけ', ['metronome']], // Final Gambit
  ['ギフトパス', ['bypassSubstitute', 'failCopycat', 'noAssist', 'mirror']], // Bestow
  ['れんごく', ['mirror', 'metronome']], // Inferno
  ['みずのちかい', ['mirror', 'metronome']], // Water Pledge
  ['ほのおのちかい', ['mirror', 'metronome']], // Fire Pledge
  ['くさのちかい', ['mirror', 'metronome']], // Grass Pledge
  ['ボルトチェンジ', ['mirror', 'metronome']], // Volt Switch
  ['むしのていこう', ['mirror', 'metronome']], // Struggle Bug
  ['じならし', ['mirror', 'metronome']], // Bulldoze
  ['こおりのいぶき', ['mirror', 'metronome']], // Frost Breath
  ['ドラゴンテール', ['failCopycat', 'noAssist', 'mirror', 'metronome']], // Dragon Tail
  ['ふるいたてる', ['snatch', 'metronome']], // Work Up
  ['エレキネット', ['mirror', 'metronome']], // Electroweb
  ['ワイルドボルト', ['mirror', 'metronome']], // Wild Charge
  ['ドリルライナー', ['mirror', 'metronome']], // Drill Run
  ['ダブルチョップ', ['mirror']], // Dual Chop
  ['ハートスタンプ', ['mirror']], // Heart Stamp
  ['ウッドホーン', ['mirror', 'metronome']], // Horn Leech
  ['せいなるつるぎ', ['mirror', 'metronome']], // Sacred Sword
  ['シェルブレード', ['mirror', 'metronome']], // Razor Shell
  ['ヒートスタンプ', ['mirror', 'metronome']], // Heat Crash
  ['グラスミキサー', ['mirror']], // Leaf Tornado
  ['ハードローラー', ['mirror']], // Steamroller
  ['コットンガード', ['snatch', 'metronome']], // Cotton Guard
  ['ナイトバースト', ['mirror', 'metronome']], // Night Daze
  ['サイコブレイク', ['mirror', 'metronome']], // Psystrike
  ['スイープビンタ', ['mirror', 'metronome']], // Tail Slap
  ['ぼうふう', ['mirror', 'metronome']], // Hurricane
  ['アフロブレイク', ['mirror']], // Head Charge
  ['ギアソーサー', ['mirror']], // Gear Grind
  ['かえんだん', ['mirror']], // Searing Shot
  ['テクノバスター', ['mirror']], // Techno Blast
  ['いにしえのうた', ['bypassSubstitute', 'mirror']], // Relic Song
  ['しんぴのつるぎ', ['mirror']], // Secret Sword
  ['こごえるせかい', ['mirror', 'metronome']], // Glaciate
  ['らいげき', ['mirror', 'metronome']], // Bolt Strike
  ['あおいほのお', ['mirror', 'metronome']], // Blue Flare
  ['ほのおのまい', ['dance', 'mirror', 'metronome']], // Fiery Dance
  ['フリーズボルト', ['charge', 'failInstruct', 'noSleepTalk', 'mirror']], // Freeze Shock
  ['コールドフレア', ['charge', 'failInstruct', 'noSleepTalk', 'mirror']], // Ice Burn
  ['バークアウト', ['bypassSubstitute', 'mirror']], // Snarl
  ['つららおとし', ['mirror', 'metronome']], // Icicle Crash
  ['Ｖジェネレート', ['mirror']], // V-create
  ['クロスフレイム', ['mirror', 'defrost', 'metronome']], // Fusion Flare
  ['クロスサンダー', ['mirror', 'metronome']], // Fusion Bolt
  ['フライングプレス', ['mirror', 'gravity', 'metronome']], // Flying Press
  ['たたみがえし', ['snatch', 'failCopycat', 'noAssist']], // Mat Block
  [
    'ゲップ',
    ['failCopycat', 'failInstruct', 'failMeFirst', 'failMimic', 'noAssist', 'noSleepTalk'],
  ], // Belch
  ['ねばねばネット', ['reflectable', 'metronome']], // Sticky Web
  ['とどめばり', ['mirror', 'metronome']], // Fell Stinger
  ['ゴーストダイブ', ['charge', 'failInstruct', 'noAssist', 'noSleepTalk', 'mirror', 'metronome']], // Phantom Force
  ['ハロウィン', ['mirror', 'reflectable']], // Trick-or-Treat
  ['おたけび', ['bypassSubstitute', 'mirror', 'reflectable', 'metronome']], // Noble Roar
  ['パラボラチャージ', ['mirror', 'metronome']], // Parabolic Charge
  ['もりののろい', ['mirror', 'reflectable', 'metronome']], // Forest's Curse
  ['はなふぶき', ['mirror', 'metronome']], // Petal Blizzard
  ['フリーズドライ', ['mirror', 'metronome']], // Freeze-Dry
  ['チャームボイス', ['bypassSubstitute', 'mirror', 'metronome']], // Disarming Voice
  ['すてゼリフ', ['bypassSubstitute', 'mirror', 'reflectable', 'metronome']], // Parting Shot
  ['ひっくりかえす', ['mirror', 'reflectable', 'metronome']], // Topsy-Turvy
  ['ドレインキッス', ['mirror', 'metronome']], // Draining Kiss
  ['グラスフィールド', ['metronome']], // Grassy Terrain
  ['ミストフィールド', ['metronome']], // Misty Terrain
  ['そうでん', ['mirror']], // Electrify
  ['じゃれつく', ['mirror', 'metronome']], // Play Rough
  ['ようせいのかぜ', ['mirror', 'metronome']], // Fairy Wind
  ['ムーンフォース', ['mirror', 'metronome']], // Moonblast
  ['ばくおんぱ', ['bypassSubstitute', 'mirror', 'metronome']], // Boomburst
  ['フェアリーロック', ['bypassSubstitute', 'mirror', 'metronome']], // Fairy Lock
  ['キングシールド', ['failCopycat', 'failInstruct', 'noAssist']], // King's Shield
  ['なかよくする', ['bypassSubstitute', 'mirror', 'reflectable', 'metronome']], // Play Nice
  ['ないしょばなし', ['bypassSubstitute', 'mirror', 'reflectable', 'metronome']], // Confide
  ['ダイヤストーム', ['mirror']], // Diamond Storm
  ['スチームバースト', ['mirror', 'defrost']], // Steam Eruption
  ['いじげんホール', ['bypassSubstitute', 'mirror']], // Hyperspace Hole
  ['みずしゅりけん', ['mirror', 'metronome']], // Water Shuriken
  ['マジカルフレイム', ['mirror', 'metronome']], // Mystical Fire
  ['ニードルガード', ['failCopycat', 'noAssist']], // Spiky Shield
  ['アロマミスト', ['bypassSubstitute', 'metronome']], // Aromatic Mist
  ['かいでんぱ', ['mirror', 'reflectable', 'metronome']], // Eerie Impulse
  ['ベノムトラップ', ['mirror', 'reflectable']], // Venom Drench
  ['ふんじん', ['bypassSubstitute', 'mirror', 'reflectable']], // Powder
  ['ジオコントロール', ['charge', 'failInstruct', 'noSleepTalk']], // Geomancy
  ['じばそうさ', ['snatch', 'bypassSubstitute', 'metronome']], // Magnetic Flux
  ['ハッピータイム', ['metronome']], // Happy Hour
  ['エレキフィールド', ['metronome']], // Electric Terrain
  ['マジカルシャイン', ['mirror', 'metronome']], // Dazzling Gleam
  ['おいわい', ['failCopycat', 'failInstruct', 'failMimic', 'noAssist', 'noSleepTalk']], // Celebrate
  [
    'てをつなぐ',
    ['bypassSubstitute', 'failCopycat', 'failInstruct', 'failMimic', 'noAssist', 'noSleepTalk'],
  ], // Hold Hands
  ['つぶらなひとみ', ['mirror', 'reflectable', 'metronome']], // Baby-Doll Eyes
  ['ほっぺすりすり', ['mirror', 'metronome']], // Nuzzle
  ['てかげん', ['mirror', 'metronome']], // Hold Back
  ['まとわりつく', ['mirror', 'metronome']], // Infestation
  ['グロウパンチ', ['mirror']], // Power-Up Punch
  ['デスウイング', ['mirror']], // Oblivion Wing
  ['サウザンアロー', ['mirror']], // Thousand Arrows
  ['サウザンウェーブ', ['mirror']], // Thousand Waves
  ['グランドフォース', ['mirror']], // Land's Wrath
  ['はめつのひかり', ['mirror']], // Light of Ruin
  ['こんげんのはどう', ['mirror']], // Origin Pulse
  ['だんがいのつるぎ', ['mirror']], // Precipice Blades
  ['ガリョウテンセイ', ['mirror']], // Dragon Ascent
  ['いじげんラッシュ', ['bypassSubstitute', 'noSketch', 'mirror']], // Hyperspace Fury
  ['すなあつめ', ['snatch', 'metronome']], // Shore Up
  ['であいがしら', ['mirror', 'metronome']], // First Impression
  ['トーチカ', ['failCopycat', 'noAssist']], // Baneful Bunker
  ['かげぬい', ['mirror', 'metronome']], // Spirit Shackle
  ['ＤＤラリアット', ['mirror', 'metronome']], // Darkest Lariat
  ['うたかたのアリア', ['bypassSubstitute', 'mirror', 'metronome']], // Sparkling Aria
  ['アイスハンマー', ['mirror', 'metronome']], // Ice Hammer
  ['フラワーヒール', ['reflectable', 'metronome']], // Floral Healing
  ['１０まんばりき', ['mirror', 'metronome']], // High Horsepower
  ['ちからをすいとる', ['mirror', 'reflectable', 'metronome']], // Strength Sap
  ['ソーラーブレード', ['charge', 'failInstruct', 'noSleepTalk', 'mirror', 'metronome']], // Solar Blade
  ['このは', ['mirror', 'metronome']], // Leafage
  ['スポットライト', ['failCopycat', 'noAssist', 'reflectable']], // Spotlight
  ['どくのいと', ['mirror', 'reflectable', 'metronome']], // Toxic Thread
  ['とぎすます', ['snatch']], // Laser Focus
  ['アシストギア', ['snatch', 'bypassSubstitute']], // Gear Up
  ['じごくづき', ['mirror', 'metronome']], // Throat Chop
  ['かふんだんご', ['mirror', 'metronome']], // Pollen Puff
  ['アンカーショット', ['mirror']], // Anchor Shot
  ['サイコフィールド', ['metronome']], // Psychic Terrain
  ['とびかかる', ['mirror', 'metronome']], // Lunge
  ['ほのおのムチ', ['mirror', 'metronome']], // Fire Lash
  ['つけあがる', ['mirror', 'metronome']], // Power Trip
  ['もえつきる', ['mirror', 'defrost', 'metronome']], // Burn Up
  ['スピードスワップ', ['bypassSubstitute', 'mirror', 'metronome']], // Speed Swap
  ['スマートホーン', ['mirror', 'metronome']], // Smart Strike
  ['じょうか', ['reflectable']], // Purify
  ['めざめるダンス', ['dance', 'mirror', 'metronome']], // Revelation Dance
  ['コアパニッシャー', ['mirror']], // Core Enforcer
  ['トロピカルキック', ['mirror', 'metronome']], // Trop Kick
  ['さいはい', ['bypassSubstitute', 'failInstruct']], // Instruct
  ['くちばしキャノン', ['failCopycat', 'failInstruct', 'failMeFirst', 'noAssist', 'noSleepTalk']], // Beak Blast
  ['スケイルノイズ', ['bypassSubstitute', 'mirror', 'metronome']], // Clanging Scales
  ['ドラゴンハンマー', ['mirror', 'metronome']], // Dragon Hammer
  ['ぶんまわす', ['mirror', 'metronome']], // Brutal Swing
  ['オーロラベール', ['snatch', 'metronome']], // Aurora Veil
  ['トラップシェル', ['failCopycat', 'failInstruct', 'failMeFirst', 'noAssist', 'noSleepTalk']], // Shell Trap
  ['フルールカノン', ['mirror']], // Fleur Cannon
  ['サイコファング', ['mirror', 'metronome']], // Psychic Fangs
  ['じだんだ', ['mirror', 'metronome']], // Stomping Tantrum
  ['シャドーボーン', ['mirror']], // Shadow Bone
  ['アクセルロック', ['mirror', 'metronome']], // Accelerock
  ['アクアブレイク', ['mirror', 'metronome']], // Liquidation
  ['プリズムレーザー', ['recharge', 'mirror', 'metronome']], // Prismatic Laser
  ['シャドースチール', ['bypassSubstitute', 'mirror']], // Spectral Thief
  ['メテオドライブ', ['mirror']], // Sunsteel Strike
  ['シャドーレイ', ['mirror']], // Moongeist Beam
  ['なみだめ', ['mirror', 'reflectable', 'metronome']], // Tearful Look
  ['びりびりちくちく', ['mirror', 'metronome']], // Zing Zap
  ['しぜんのいかり', ['mirror']], // Nature's Madness
  ['マルチアタック', ['mirror']], // Multi-Attack
  ['ビックリヘッド', ['mirror']], // Mind Blown
  ['プラズマフィスト', ['mirror']], // Plasma Fists
  ['フォトンゲイザー', ['mirror']], // Photon Geyser
  ['ばちばちアクセル', ['mirror']], // Zippy Zap
  ['ざぶざぶサーフ', ['mirror']], // Splishy Splash
  ['ふわふわフォール', ['mirror', 'gravity']], // Floaty Fall
  ['ピカピカサンダー', ['mirror']], // Pika Papow
  ['いきいきバブル', ['mirror']], // Bouncy Bubble
  ['びりびりエレキ', ['mirror']], // Buzzy Buzz
  ['めらめらバーン', ['mirror', 'defrost']], // Sizzly Slide
  ['どばどばオーラ', ['mirror']], // Glitzy Glow
  ['わるわるゾーン', ['mirror']], // Baddy Bad
  ['すくすくボンバー', ['mirror', 'reflectable']], // Sappy Seed
  ['こちこちフロスト', ['mirror']], // Freezy Frost
  ['きらきらストーム', ['mirror']], // Sparkly Swirl
  ['ブイブイブレイク', ['mirror']], // Veevee Volley
  ['ダブルパンツァー', ['mirror']], // Double Iron Bash
  ['ダイマックスほう', ['failCopycat', 'failEncore', 'failInstruct', 'failMimic', 'noSleepTalk']], // Dynamax Cannon
  ['ねらいうち', ['mirror', 'metronome']], // Snipe Shot
  ['くらいつく', ['mirror', 'metronome']], // Jaw Lock
  ['ほおばる', ['snatch', 'metronome']], // Stuff Cheeks
  ['はいすいのじん', ['snatch', 'metronome']], // No Retreat
  ['タールショット', ['mirror', 'reflectable', 'metronome']], // Tar Shot
  ['まほうのこな', ['mirror', 'reflectable', 'metronome']], // Magic Powder
  ['ドラゴンアロー', ['mirror', 'metronome']], // Dragon Darts
  ['おちゃかい', ['bypassSubstitute', 'metronome']], // Teatime
  ['たこがため', ['mirror']], // Octolock
  ['でんげきくちばし', ['mirror']], // Bolt Beak
  ['エラがみ', ['mirror']], // Fishious Rend
  ['コートチェンジ', ['mirror', 'metronome']], // Court Change
  ['ソウルビート', ['snatch', 'dance']], // Clangorous Soul
  ['ボディプレス', ['mirror']], // Body Press
  ['ドラムアタック', ['mirror']], // Drum Beating
  ['トラバサミ', ['mirror']], // Snap Trap
  ['かえんボール', ['mirror', 'defrost']], // Pyro Ball
  ['きょじゅうざん', ['failCopycat', 'failMimic', 'mirror']], // Behemoth Blade
  ['きょじゅうだん', ['failCopycat', 'failMimic', 'mirror']], // Behemoth Bash
  ['オーラぐるま', ['mirror']], // Aura Wheel
  ['ワイドブレイカー', ['mirror']], // Breaking Swipe
  ['えだづき', ['mirror']], // Branch Poke
  ['オーバードライブ', ['bypassSubstitute', 'mirror']], // Overdrive
  ['りんごさん', ['mirror']], // Apple Acid
  ['Ｇのちから', ['mirror']], // Grav Apple
  ['ソウルクラッシュ', ['mirror']], // Spirit Break
  ['ワンダースチーム', ['mirror']], // Strange Steam
  ['いのちのしずく', ['snatch', 'bypassSubstitute']], // Life Dew
  ['ブロッキング', ['failInstruct']], // Obstruct
  ['どげざつき', ['mirror']], // False Surrender
  ['スターアサルト', ['recharge', 'failInstruct', 'mirror']], // Meteor Assault
  ['ムゲンダイビーム', ['recharge', 'mirror']], // Eternabeam
  ['てっていこうせん', ['mirror']], // Steel Beam
  ['ワイドフォース', ['mirror', 'metronome']], // Expanding Force
  ['アイアンローラー', ['mirror', 'metronome']], // Steel Roller
  ['スケイルショット', ['mirror', 'metronome']], // Scale Shot
  ['メテオビーム', ['charge', 'mirror', 'metronome']], // Meteor Beam
  ['シェルアームズ', ['mirror', 'metronome']], // Shell Side Arm
  ['ミストバースト', ['mirror', 'metronome']], // Misty Explosion
  ['グラススライダー', ['mirror', 'metronome']], // Grassy Glide
  ['ライジングボルト', ['mirror', 'metronome']], // Rising Voltage
  ['だいちのはどう', ['mirror', 'metronome']], // Terrain Pulse
  ['はいよるいちげき', ['mirror', 'metronome']], // Skitter Smack
  ['しっとのほのお', ['mirror', 'metronome']], // Burning Jealousy
  ['うっぷんばらし', ['mirror', 'metronome']], // Lash Out
  ['ポルターガイスト', ['mirror', 'metronome']], // Poltergeist
  ['ふしょくガス', ['mirror', 'reflectable', 'metronome']], // Corrosive Gas
  ['コーチング', ['bypassSubstitute', 'metronome']], // Coaching
  ['クイックターン', ['mirror', 'metronome']], // Flip Turn
  ['トリプルアクセル', ['mirror', 'metronome']], // Triple Axel
  ['ダブルウイング', ['mirror', 'metronome']], // Dual Wingbeat
  ['ねっさのだいち', ['mirror', 'defrost', 'metronome']], // Scorching Sands
  ['ジャングルヒール', ['bypassSubstitute']], // Jungle Healing
  ['あんこくきょうだ', ['mirror']], // Wicked Blow
  ['すいりゅうれんだ', ['mirror']], // Surging Strikes
  ['サンダープリズン', ['mirror']], // Thunder Cage
  ['ドラゴンエナジー', ['mirror']], // Dragon Energy
  ['いてつくしせん', ['mirror']], // Freezing Glare
  ['もえあがるいかり', ['mirror']], // Fiery Wrath
  ['らいめいげり', ['mirror']], // Thunderous Kick
  ['ブリザードランス', ['mirror']], // Glacial Lance
  ['アストラルビット', ['mirror']], // Astral Barrage
  ['ぶきみなじゅもん', ['bypassSubstitute', 'mirror', 'metronome']], // Eerie Spell
  ['フェイタルクロー', ['mirror', 'metronome']], // Dire Claw
  ['バリアーラッシュ', ['mirror', 'metronome']], // Psyshield Bash
  ['パワーシフト', ['snatch']], // Power Shift
  ['がんせきアックス', ['mirror', 'metronome']], // Stone Axe
  ['はるのあらし', ['mirror']], // Springtide Storm
  ['しんぴのちから', ['mirror', 'metronome']], // Mystical Power
  ['だいふんげき', ['mirror', 'lockedMove']], // Raging Fury
  ['ウェーブタックル', ['mirror', 'metronome']], // Wave Crash
  ['クロロブラスト', ['mirror', 'metronome']], // Chloroblast
  ['ひょうざんおろし', ['mirror', 'metronome']], // Mountain Gale
  ['しょうりのまい', ['snatch', 'dance', 'metronome']], // Victory Dance
  ['ぶちかまし', ['mirror', 'metronome']], // Headlong Rush
  ['どくばりセンボン', ['mirror', 'metronome']], // Barb Barrage
  ['オーラウイング', ['mirror', 'metronome']], // Esper Wing
  ['うらみつらみ', ['mirror', 'metronome']], // Bitter Malice
  ['たてこもる', ['snatch', 'metronome']], // Shelter
  ['３ぼんのや', ['mirror', 'metronome']], // Triple Arrows
  ['ひゃっきやこう', ['mirror', 'metronome']], // Infernal Parade
  ['ひけん・ちえなみ', ['mirror', 'metronome']], // Ceaseless Edge
  ['こがらしあらし', ['mirror', 'metronome']], // Bleakwind Storm
  ['かみなりあらし', ['mirror', 'metronome']], // Wildbolt Storm
  ['ねっさのあらし', ['mirror', 'metronome']], // Sandsear Storm
  ['みかづきのいのり', ['snatch', 'metronome']], // Lunar Blessing
  ['ブレイブチャージ', ['snatch', 'metronome']], // Take Heart
  ['テラバースト', ['mirror', 'mustPressure', 'metronome']], // Tera Blast
  ['かかとおとし', ['mirror', 'metronome']], // Axe Kick
  ['おはかまいり', ['mirror', 'metronome']], // Last Respects
  ['ルミナコリジョン', ['mirror', 'metronome']], // Lumina Crash
  ['ジェットパンチ', ['mirror']], // Jet Punch
  ['ハバネロエキス', ['mirror', 'reflectable']], // Spicy Extract
  ['ホイールスピン', ['mirror', 'metronome']], // Spin Out
  ['ネズミざん', ['mirror']], // Population Bomb
  ['アイススピナー', ['mirror', 'metronome']], // Ice Spinner
  ['きょけんとつげき', ['mirror', 'metronome']], // Glaive Rush
  ['さいきのいのり', ['noSketch']], // Revival Blessing
  ['しおづけ', ['mirror']], // Salt Cure
  ['トリプルダイブ', ['mirror', 'metronome']], // Triple Dive
  ['キラースピン', ['mirror', 'metronome']], // Mortal Spin
  ['みをけずる', ['snatch']], // Fillet Away
  ['ドゲザン', ['mirror', 'metronome']], // Kowtow Cleave
  ['トリックフラワー', ['mirror', 'metronome']], // Flower Trick
  ['フレアソング', ['bypassSubstitute', 'mirror', 'metronome']], // Torch Song
  ['アクアステップ', ['dance', 'mirror', 'metronome']], // Aqua Step
  ['レイジングブル', ['mirror']], // Raging Bull
  ['ゴールドラッシュ', ['mirror']], // Make It Rain
  ['サイコブレイド ', ['mirror', 'metronome']], // Psyblade
  ['ハイドロスチーム', ['mirror', 'defrost', 'metronome']], // Hydro Steam
  ['カタストロフィ', ['mirror']], // Ruination
  ['アクセルブレイク', ['mirror']], // Collision Course
  ['イナズマドライブ', ['mirror']], // Electro Drift
  ['とびつく', ['mirror']], // Pounce
  ['くさわけ', ['mirror']], // Trailblaze
  ['ひやみず', ['mirror']], // Chilling Water
  ['ハイパードリル', ['mirror']], // Hyper Drill
  ['ツインビーム', ['mirror']], // Twin Beam
  ['ふんどのこぶし', ['mirror']], // Rage Fist
  ['アーマーキャノン', ['mirror']], // Armor Cannon
  ['むねんのつるぎ', ['mirror', 'metronome']], // Bitter Blade
  ['でんこうそうげき', ['mirror']], // Double Shock
  ['デカハンマー', ['mirror', 'cantUseTwice', 'metronome']], // Gigaton Hammer
  ['ほうふく', ['failMeFirst', 'mirror']], // Comeuppance
  ['アクアカッター', ['mirror', 'metronome']], // Aqua Cutter
  [
    'バーンアクセル',
    [
      'failCopycat',
      'failEncore',
      'failInstruct',
      'failMeFirst',
      'failMimic',
      'noAssist',
      'noSketch',
      'noSleepTalk',
    ],
  ], // Blazing Torque
  [
    'ダークアクセル',
    [
      'failCopycat',
      'failEncore',
      'failInstruct',
      'failMeFirst',
      'failMimic',
      'noAssist',
      'noSketch',
      'noSleepTalk',
    ],
  ], // Wicked Torque
  [
    'ポイズンアクセル',
    [
      'failCopycat',
      'failEncore',
      'failInstruct',
      'failMeFirst',
      'failMimic',
      'noAssist',
      'noSketch',
      'noSleepTalk',
    ],
  ], // Noxious Torque
  [
    'ファイトアクセル',
    [
      'failCopycat',
      'failEncore',
      'failInstruct',
      'failMeFirst',
      'failMimic',
      'noAssist',
      'noSketch',
      'noSleepTalk',
    ],
  ], // Combat Torque
  [
    'マジカルアクセル',
    [
      'failCopycat',
      'failEncore',
      'failInstruct',
      'failMeFirst',
      'failMimic',
      'noAssist',
      'noSketch',
      'noSleepTalk',
    ],
  ], // Magical Torque
  ['ブラッドムーン', ['mirror', 'cantUseTwice', 'metronome']], // Blood Moon
  ['シャカシャカほう', ['mirror', 'defrost', 'metronome']], // Matcha Gotcha
  ['みずあめボム', ['mirror', 'metronome']], // Syrup Bomb
  ['ツタこんぼう', ['mirror', 'metronome']], // Ivy Cudgel
  ['エレクトロビーム', ['charge', 'mirror', 'metronome']], // Electro Shot
  ['テラクラスター', ['failCopycat', 'failMimic', 'noAssist', 'noSketch', 'mirror']], // Tera Starstorm
  ['きまぐレーザー', ['mirror', 'metronome']], // Fickle Beam
  ['かえんのまもり', ['failCopycat', 'noAssist', 'metronome']], // Burning Bulwark
  ['じんらい', ['mirror', 'metronome']], // Thunderclap
  ['パワフルエッジ', ['mirror', 'metronome']], // Mighty Cleave
  ['タキオンカッター', ['mirror', 'metronome']], // Tachyon Cutter
  ['ハードプレス', ['mirror', 'metronome']], // Hard Press
  ['ドラゴンエール', ['bypassSubstitute', 'metronome']], // Dragon Cheer
  ['みわくのボイス', ['bypassSubstitute', 'mirror', 'metronome']], // Alluring Voice
  ['やけっぱち', ['mirror', 'metronome']], // Temper Flare
  ['サンダーダイブ', ['mirror', 'metronome']], // Supercell Slam
  ['サイコノイズ', ['bypassSubstitute', 'mirror', 'metronome']], // Psychic Noise
  ['はやてがえし', ['mirror', 'metronome']], // Upper Hand
  ['じゃどくのくさり', ['mirror', 'metronome']], // Malignant Chain
];
