#!/bin/bash
# GitHub에 코드 올리기 스크립트

REPO="https://KIMSVMD:${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/KIMSVMD/kimschecklist.git"

git config user.email "kimsvmd@github.com"
git config user.name "KIMSVMD"

# GitHub remote 추가
git remote add github "$REPO" 2>/dev/null || git remote set-url github "$REPO"

# 현재 브랜치를 main으로 push
git push github HEAD:main --force

echo "완료! https://github.com/KIMSVMD/kimschecklist 에서 확인하세요"
