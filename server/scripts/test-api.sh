#!/bin/bash

# API動作確認スクリプト
# このスクリプトは、サーバーが起動していることを前提とします

BASE_URL="http://localhost:3000"

echo "=== Pokemon API 動作確認 ==="
echo ""

echo "1. ポケモン取得API (ID: 1)"
curl -s "${BASE_URL}/pokemon/1" | jq '.' || echo "エラー: ポケモンが見つからない、またはサーバーが起動していません"
echo ""

echo "2. 特性効果取得API (特性名: いかく)"
curl -s "${BASE_URL}/pokemon/ability/いかく/effect" | jq '.' || echo "エラー: 特性が見つからない、またはサーバーが起動していません"
echo ""

echo "3. 存在しないポケモン取得API (ID: 999)"
curl -s "${BASE_URL}/pokemon/999" | jq '.' || echo "エラー"
echo ""

echo "=== 動作確認完了 ==="

