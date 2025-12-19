#!/usr/bin/env python3
"""
GitHubのissuesからsubissuesを作成するスクリプト
各issueの内容を効果の種類ごとにグループ化してsubissuesを作成
"""

import json
import subprocess
import re
from typing import List, Dict, Tuple

REPO = "generonishimura/pxkxmxn"

def run_gh_command(cmd: List[str]) -> Dict:
    """ghコマンドを実行してJSONを取得"""
    result = subprocess.run(
        ["gh"] + cmd + ["--json", "body,title,number"],
        capture_output=True,
        text=True,
        check=True
    )
    return json.loads(result.stdout)

def parse_moves_from_issue_body(body: str) -> List[Dict]:
    """Issue本文から技のリストを抽出"""
    moves = []
    # テーブル形式の技リストを抽出
    lines = body.split('\n')
    in_table = False
    for line in lines:
        if '| 日本語名 |' in line or '| 日本語名' in line:
            in_table = True
            continue
        if in_table:
            # テーブルの区切り行をスキップ
            if line.strip().startswith('|---') or line.strip() == '':
                continue
            # テーブル終了の判定
            if '##' in line and not line.strip().startswith('|'):
                break
            if line.startswith('|'):
                parts = [p.strip() for p in line.split('|')]
                # 空のpartsを除外
                parts = [p for p in parts if p]
                if len(parts) >= 6:
                    # 日本語名、英語名、カテゴリ、威力、命中率、説明の順
                    moves.append({
                        'japanese': parts[0] if len(parts) > 0 else '',
                        'english': parts[1] if len(parts) > 1 else '',
                        'category': parts[2] if len(parts) > 2 else '',
                        'power': parts[3] if len(parts) > 3 else '',
                        'accuracy': parts[4] if len(parts) > 4 else '',
                        'description': parts[5] if len(parts) > 5 else ''
                    })
    return moves

def parse_abilities_from_issue_body(body: str) -> List[Dict]:
    """Issue本文から特性のリストを抽出（セクションごと）"""
    abilities = []
    lines = body.split('\n')
    current_section = None
    in_table = False
    
    for i, line in enumerate(lines):
        # セクション見出しを検出（### で始まる行）
        if line.strip().startswith('###'):
            current_section = line.strip().replace('###', '').strip()
            in_table = False
            continue
        
        # テーブル開始を検出
        if ('| 日本語名 |' in line or '| 日本語名' in line) and '英語名' in line:
            in_table = True
            continue
        
        if in_table:
            # テーブルの区切り行をスキップ
            if line.strip().startswith('|---') or line.strip() == '':
                continue
            # テーブル終了の判定（次のセクションまたは##で始まる行）
            if line.strip().startswith('###') or (line.strip().startswith('##') and not line.strip().startswith('|---')):
                in_table = False
                if line.strip().startswith('###'):
                    current_section = line.strip().replace('###', '').strip()
                continue
            
            if line.startswith('|'):
                parts = [p.strip() for p in line.split('|')]
                # 空のpartsを除外
                parts = [p for p in parts if p]
                if len(parts) >= 4:
                    # 日本語名、英語名、トリガー、カテゴリの順
                    ability = {
                        'japanese': parts[0] if len(parts) > 0 else '',
                        'english': parts[1] if len(parts) > 1 else '',
                        'trigger': parts[2] if len(parts) > 2 else '',
                        'category': parts[3] if len(parts) > 3 else '',
                        'section': current_section or 'その他'
                    }
                    abilities.append(ability)
    
    return abilities

def categorize_moves(moves: List[Dict]) -> Dict[str, List[Dict]]:
    """技を効果の種類ごとに分類"""
    categories = {}
    
    for move in moves:
        desc = move['description'].lower()
        category = None
        
        if 'burn' in desc:
            category = 'やけど付与'
        elif 'paralyze' in desc:
            category = 'まひ付与'
        elif 'freeze' in desc:
            category = 'こおり付与'
        elif 'poison' in desc:
            category = 'どく付与'
        elif 'sleep' in desc:
            category = 'ねむり付与'
        elif 'flinch' in desc:
            category = 'ひるみ付与'
        elif 'recoil' in desc:
            category = '反動ダメージ'
        elif 'heal' in desc or 'recover' in desc or 'drain' in desc:
            category = 'HP回復'
        elif 'stat' in desc:
            category = '能力変化'
        elif 'weather' in desc:
            category = '天候関連'
        elif 'terrain' in desc:
            category = 'フィールド変化'
        elif 'switch' in desc or 'flee' in desc:
            category = '交代・逃走'
        elif 'protect' in desc or 'block' in desc:
            category = '防御技'
        elif 'confuse' in desc:
            category = 'こんらん付与'
        elif 'critical' in desc:
            category = '急所率上昇'
        elif 'power' in desc and ('double' in desc or 'higher' in desc):
            category = '威力変化'
        elif 'charge' in desc or 'turn' in desc:
            category = 'チャージ技'
        elif 'copy' in desc or 'mimic' in desc:
            category = 'コピー系'
        elif 'item' in desc:
            category = '道具関連'
        elif 'ability' in desc:
            category = '特性関連'
        elif 'type' in desc and 'change' in desc:
            category = 'タイプ変化'
        elif 'nothing' in desc or 'does nothing' in desc:
            category = '効果なし'
        else:
            category = 'その他'
        
        if category not in categories:
            categories[category] = []
        categories[category].append(move)
    
    return categories

def categorize_abilities(abilities: List[Dict]) -> Dict[str, List[Dict]]:
    """特性をセクションごとに分類（セクションがない場合はトリガーごと）"""
    categories = {}
    
    for ability in abilities:
        # セクションがある場合はセクションで分類、ない場合はトリガーで分類
        key = ability.get('section') or ability['trigger']
        if key not in categories:
            categories[key] = []
        categories[key].append(ability)
    
    return categories

def create_subissue(title: str, body: str, labels: List[str] = None, dry_run: bool = False):
    """Subissueを作成"""
    if labels is None:
        labels = ['enhancement']
    
    if dry_run:
        print(f"\n[DRY RUN] Would create issue:")
        print(f"  Title: {title}")
        print(f"  Labels: {', '.join(labels)}")
        print(f"  Body preview: {body[:200]}...")
        return
    
    cmd = ['gh', 'issue', 'create', '--repo', REPO, '--title', title]
    for label in labels:
        cmd.extend(['--label', label])
    
    # bodyを一時ファイルに書き込んで使用
    import tempfile
    with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False, encoding='utf-8') as f:
        f.write(body)
        temp_file = f.name
    
    cmd.extend(['--body-file', temp_file])
    
    try:
        subprocess.run(cmd, check=True)
        print(f"✓ Created: {title}")
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to create: {title} - {e}")
    finally:
        import os
        os.unlink(temp_file)

def create_move_subissues(issue_number: int, issue_title: str, dry_run: bool = False):
    """技のissueからsubissuesを作成"""
    print(f"\n=== Issue #{issue_number}: {issue_title} ===")
    
    # Issueの内容を取得
    result = run_gh_command(['issue', 'view', str(issue_number)])
    if isinstance(result, list):
        issue = result[0]
    else:
        issue = result
    
    body = issue['body']
    moves = parse_moves_from_issue_body(body)
    
    if not moves:
        print(f"  No moves found in issue #{issue_number}")
        return
    
    # 効果の種類ごとに分類
    categories = categorize_moves(moves)
    
    print(f"  見つかった技: {len(moves)}件")
    print(f"  カテゴリ数: {len(categories)}")
    
    # 各カテゴリでsubissueを作成
    for category, category_moves in categories.items():
        if len(category_moves) == 0:
            continue
        
        title = f"[#{issue_number}] {issue_title.split('（')[0]}: {category} ({len(category_moves)}件)"
        
        moves_list = '\n'.join([
            f"- {m['japanese']} ({m['english']}): {m['description']}"
            for m in category_moves
        ])
        
        body_text = f"""## 概要
Issue #{issue_number}のsubissue: {category}の効果を持つ技を実装する。

## 実装対象の技（{len(category_moves)}件）

{moves_list}

## 対応内容
- 各技の特殊効果ロジッククラスを実装
- 必要に応じて基底クラスを作成・拡張
- `MoveRegistry`に登録
- テストケースを追加

## 注意事項
- 全ての技を実装する必要がある（網羅性が重要）
- 実装完了後、テストスクリプト（`npm run check:coverage`）で網羅性を確認

## 参考
- `server/src/modules/pokemon/domain/moves/move-registry.ts`
- `server/src/modules/pokemon/domain/moves/effects/`

## 親Issue
#{issue_number}
"""
        
        create_subissue(title, body_text, dry_run=dry_run)

def create_ability_subissues(issue_number: int, issue_title: str, dry_run: bool = False):
    """特性のissueからsubissuesを作成"""
    print(f"\n=== Issue #{issue_number}: {issue_title} ===")
    
    # Issueの内容を取得
    result = run_gh_command(['issue', 'view', str(issue_number)])
    if isinstance(result, list):
        issue = result[0]
    else:
        issue = result
    
    body = issue['body']
    abilities = parse_abilities_from_issue_body(body)
    
    if not abilities:
        print(f"  No abilities found in issue #{issue_number}")
        return
    
    # トリガーごとに分類
    categories = categorize_abilities(abilities)
    
    print(f"  見つかった特性: {len(abilities)}件")
    print(f"  トリガー数: {len(categories)}")
    
    # 各カテゴリでsubissueを作成
    for trigger, trigger_abilities in categories.items():
        if len(trigger_abilities) == 0:
            continue
        
        # セクション名またはトリガー名を使用
        section_name = trigger_abilities[0].get('section') or trigger
        title = f"[#{issue_number}] {issue_title.split('（')[0]}: {section_name} ({len(trigger_abilities)}件)"
        
        abilities_list = '\n'.join([
            f"- {a['japanese']} ({a['english']}): {a['trigger']} / {a['category']}"
            for a in trigger_abilities
        ])
        
        body_text = f"""## 概要
Issue #{issue_number}のsubissue: {section_name}の特性を実装する。

## 実装対象の特性（{len(trigger_abilities)}件）

{abilities_list}

## 対応内容
- 各特性のロジッククラスを実装
- 必要に応じて基底クラスを作成・拡張
- `AbilityRegistry`に登録
- テストケースを追加

## 注意事項
- 全ての特性を実装する必要がある（網羅性が重要）
- 実装完了後、テストスクリプト（`npm run check:coverage`）で網羅性を確認

## 参考
- `server/src/modules/pokemon/domain/abilities/ability-registry.ts`
- `server/src/modules/pokemon/domain/abilities/effects/`

## 親Issue
#{issue_number}
"""
        
        create_subissue(title, body_text, dry_run=dry_run)

def main():
    """メイン処理"""
    import sys
    
    # dry-runモードの確認
    dry_run = '--dry-run' in sys.argv or '-n' in sys.argv
    
    if dry_run:
        print("=== DRY RUN MODE ===")
        print("実際にはissueを作成しません。\n")
    else:
        print("Subissues作成を開始します...")
        print("実際にissueを作成します。続行しますか？ (y/N): ", end='')
        response = input().strip().lower()
        if response != 'y':
            print("キャンセルしました。")
            return
    
    # 技のissues
    move_issues = [
        (91, "特殊カテゴリの未実装技の特殊効果の実装（41件）"),
        (90, "変化カテゴリの未実装技の特殊効果の実装（263件）"),
        (89, "物理カテゴリの未実装技の特殊効果の実装（62件）"),
    ]
    
    # 特性のissues
    ability_issues = [
        (88, "ダメージ修正カテゴリの未実装特性の実装（8件）"),
        (87, "天候カテゴリの未実装特性の実装（4件）"),
        (86, "ステータス変化カテゴリの未実装特性の実装（7件）"),
        (85, "無効化カテゴリの未実装特性の実装（5件）"),
        (84, "その他カテゴリの未実装特性の実装（318件）"),
    ]
    
    # 技のsubissuesを作成
    for issue_num, issue_title in move_issues:
        try:
            create_move_subissues(issue_num, issue_title, dry_run)
        except Exception as e:
            print(f"Error processing issue #{issue_num}: {e}")
    
    # 特性のsubissuesを作成
    for issue_num, issue_title in ability_issues:
        try:
            create_ability_subissues(issue_num, issue_title, dry_run)
        except Exception as e:
            print(f"Error processing issue #{issue_num}: {e}")
    
    if dry_run:
        print("\n=== DRY RUN完了 ===")
        print("実際に作成するには、--dry-runオプションを外して実行してください。")
    else:
        print("\nSubissues作成完了！")

if __name__ == '__main__':
    main()

