type AbilityTriggerValue =
  | 'OnEntry'
  | 'OnTakingDamage'
  | 'OnDealingDamage'
  | 'OnTurnEnd'
  | 'OnSwitchOut'
  | 'Passive'
  | 'OnStatusCondition'
  | 'Other';

type AbilityCategoryValue =
  | 'StatChange'
  | 'Immunity'
  | 'Weather'
  | 'DamageModify'
  | 'StatusCondition'
  | 'Other';

export interface AbilityMetadata {
  triggerEvent: AbilityTriggerValue;
  effectCategory: AbilityCategoryValue;
}

const abilityMetadataMap: Record<string, AbilityMetadata> = {
  // ===== 天候系（バトルで使用） =====
  あめふらし: {
    triggerEvent: 'OnEntry',
    effectCategory: 'Weather',
  },
  ひでり: {
    triggerEvent: 'OnEntry',
    effectCategory: 'Weather',
  },
  すなあらし: {
    triggerEvent: 'OnEntry',
    effectCategory: 'Weather',
  },
  ゆきふらし: {
    triggerEvent: 'OnEntry',
    effectCategory: 'Weather',
  },
  でんきエンジン: {
    triggerEvent: 'OnEntry',
    effectCategory: 'Weather', // エレキフィールドを展開
  },
  グラスメイカー: {
    triggerEvent: 'OnEntry',
    effectCategory: 'Weather', // グラスフィールドを展開
  },
  ミストメイカー: {
    triggerEvent: 'OnEntry',
    effectCategory: 'Weather', // ミストフィールドを展開
  },
  サイコメイカー: {
    triggerEvent: 'OnEntry',
    effectCategory: 'Weather', // サイコフィールドを展開
  },

  // ===== 状態異常無効化系（バトルで使用） =====
  ふみん: {
    triggerEvent: 'OnStatusCondition',
    effectCategory: 'Immunity', // ねむり無効化
  },
  どんかん: {
    triggerEvent: 'OnStatusCondition',
    effectCategory: 'Immunity', // メロメロ・あくび無効化
  },
  やるき: {
    triggerEvent: 'OnStatusCondition',
    effectCategory: 'Immunity', // ねむり無効化
  },
  めんえき: {
    triggerEvent: 'OnStatusCondition',
    effectCategory: 'Immunity', // どく無効化
  },
  すいほう: {
    triggerEvent: 'OnStatusCondition',
    effectCategory: 'Immunity', // やけど無効化
  },
  みずのベール: {
    triggerEvent: 'OnStatusCondition',
    effectCategory: 'Immunity', // やけど無効化
  },
  マイペース: {
    triggerEvent: 'OnStatusCondition',
    effectCategory: 'Immunity', // こんらん無効化
  },

  // ===== タイプ無効化系（バトルで使用） =====
  ふゆう: {
    triggerEvent: 'Passive',
    effectCategory: 'Immunity', // じめんタイプの技を無効化
  },
  ちくでん: {
    triggerEvent: 'OnTakingDamage',
    effectCategory: 'Immunity', // でんきタイプの技を無効化してHP回復
  },
  もらいび: {
    triggerEvent: 'OnTakingDamage',
    effectCategory: 'Immunity', // ほのおタイプの技を無効化してほのお技強化
  },
  ちょすい: {
    triggerEvent: 'OnTakingDamage',
    effectCategory: 'Immunity', // みずタイプの技を無効化してHP回復
  },
  もふもふ: {
    triggerEvent: 'OnTakingDamage',
    effectCategory: 'DamageModify', // 接触技のダメージ半減、ほのおタイプのダメージ2倍
  },

  // ===== ダメージ修正系（バトルで使用） =====
  マルチスケイル: {
    triggerEvent: 'OnTakingDamage',
    effectCategory: 'DamageModify', // HP満タン時、受けるダメージ半減
  },
  あついしぼう: {
    triggerEvent: 'OnTakingDamage',
    effectCategory: 'DamageModify', // ほのお・こおりタイプのダメージ半減
  },
  はがねつかい: {
    triggerEvent: 'OnDealingDamage',
    effectCategory: 'DamageModify', // はがねタイプの技の威力1.5倍
  },
  はがねのせいしん: {
    triggerEvent: 'OnDealingDamage',
    effectCategory: 'DamageModify', // はがねタイプの技の威力1.5倍
  },
  てきおうりょく: {
    triggerEvent: 'OnDealingDamage',
    effectCategory: 'DamageModify', // タイプ一致の技の威力2倍
  },
  すてみ: {
    triggerEvent: 'OnDealingDamage',
    effectCategory: 'DamageModify', // 反動技の威力1.2倍
  },
  ちからずく: {
    triggerEvent: 'OnDealingDamage',
    effectCategory: 'DamageModify', // 追加効果を無くして威力1.3倍
  },
  すなのちから: {
    triggerEvent: 'Passive',
    effectCategory: 'DamageModify', // 砂嵐時、いわ・じめん・はがねタイプの技の威力1.3倍
  },
  がんじょう: {
    triggerEvent: 'OnTakingDamage',
    effectCategory: 'DamageModify', // 一撃必殺技を無効化
  },
  しんりょく: {
    triggerEvent: 'Passive',
    effectCategory: 'DamageModify', // HPが1/3以下で、くさタイプの技の威力1.5倍
  },
  もうか: {
    triggerEvent: 'Passive',
    effectCategory: 'DamageModify', // HPが1/3以下で、ほのおタイプの技の威力1.5倍
  },
  げきりゅう: {
    triggerEvent: 'Passive',
    effectCategory: 'DamageModify', // HPが1/3以下で、みずタイプの技の威力1.5倍
  },
  スナイパー: {
    triggerEvent: 'OnDealingDamage',
    effectCategory: 'DamageModify', // 急所時、ダメージ2.25倍
  },
  テクニシャン: {
    triggerEvent: 'OnDealingDamage',
    effectCategory: 'DamageModify', // 威力60以下の技の威力1.5倍
  },

  // ===== ステータス変化系（バトルで使用） =====
  いかく: {
    triggerEvent: 'OnEntry',
    effectCategory: 'StatChange', // 場に出たとき、相手の攻撃を1段階下げる
  },
  すいすい: {
    triggerEvent: 'Passive',
    effectCategory: 'StatChange', // 雨の時、素早さ2倍
  },
  ようりょくそ: {
    triggerEvent: 'Passive',
    effectCategory: 'StatChange', // 晴れの時、素早さ2倍
  },
  すなかき: {
    triggerEvent: 'Passive',
    effectCategory: 'StatChange', // 砂嵐の時、素早さ2倍
  },
  はりきり: {
    triggerEvent: 'Passive',
    effectCategory: 'StatChange', // 状態異常時、攻撃1.5倍
  },
  はやあし: {
    triggerEvent: 'Passive',
    effectCategory: 'StatChange', // 状態異常時、素早さ1.5倍
  },
  まけんき: {
    triggerEvent: 'OnTurnEnd',
    effectCategory: 'StatChange', // 能力が下がった時、攻撃2段階上昇
  },
  きもったま: {
    triggerEvent: 'OnTurnEnd',
    effectCategory: 'StatChange', // 相手を倒した時、攻撃1段階上昇
  },
  かちき: {
    triggerEvent: 'OnTurnEnd',
    effectCategory: 'StatChange', // 相手を倒した時、素早さ1段階上昇
  },
  こんじょう: {
    triggerEvent: 'Passive',
    effectCategory: 'StatChange', // HPが1/3以下で、状態異常時、攻撃1.5倍
  },
  ぎゃくじょう: {
    triggerEvent: 'OnTakingDamage',
    effectCategory: 'StatChange', // ダメージを受けてHPが1/2以下になった時、特攻1段階上昇
  },
  ちからもち: {
    triggerEvent: 'Passive',
    effectCategory: 'StatChange', // 攻撃が2倍
  },
  はとむね: {
    triggerEvent: 'Passive',
    effectCategory: 'StatChange', // 防御が2倍
  },

  // ===== その他（バトルで使用する可能性がある特性） =====
  かたやぶり: {
    triggerEvent: 'Passive',
    effectCategory: 'Other', // 相手の特性を無視（バトルで重要）
  },
  いとあみ: {
    triggerEvent: 'OnSwitchOut',
    effectCategory: 'StatChange', // 場から下がるとき、相手の素早さを1段階下げる
  },
  どくどく: {
    triggerEvent: 'OnTakingDamage',
    effectCategory: 'StatusCondition', // 接触技を受けたとき、30%の確率で相手をどくにする
  },
  せいでんき: {
    triggerEvent: 'OnTakingDamage',
    effectCategory: 'StatusCondition', // 接触技を受けたとき、30%の確率で相手をまひにする
  },
  もうふう: {
    triggerEvent: 'OnTakingDamage',
    effectCategory: 'StatusCondition', // 接触技を受けたとき、30%の確率で相手をやけどにする
  },
};

const defaultMetadata: AbilityMetadata = {
  triggerEvent: 'Other',
  effectCategory: 'Other',
};

export const getAbilityMetadata = (abilityName: string): AbilityMetadata =>
  abilityMetadataMap[abilityName] ?? defaultMetadata;
