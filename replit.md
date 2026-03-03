# 디지털 VM 체크리스트 — 킴스클럽

## 개요
킴스클럽 매장 VMD 담당자 및 현장 직원용 디지털 점검 시스템.  
Mobile-first, 장갑 착용 환경 고려한 대형 UI.

## 기술 스택
- **Frontend**: React + Vite + TanStack Query + Wouter + Tailwind CSS + shadcn/ui + Framer Motion
- **Backend**: Express (TypeScript) + Drizzle ORM
- **DB**: PostgreSQL (Replit)
- **업로드**: Multer → `/uploads/` 정적 서빙

## 주요 기능
1. **새 점검 등록** (`/checklist/new`) - 4단계 위저드
   - Step1: 지점 선택 (수도권/지방)
   - Step2: 대분류 선택 (농산/수산/축산/공산)
   - Step3: 2단계 상품 선택 (그룹 → 세부상품, DB 기반)
   - Step4: 사진 촬영 + 가이드 확인 + 항목별 평가 + 제출

2. **현장 직원 대시보드** (`/staff-dashboard`) - 지점 필터 + 수정/삭제

3. **관리자 대시보드** (`/dashboard`) - 관리자 로그인 필요, 전체 점검 기록 열람/관리

4. **관리자 메뉴** (`/admin/guides`) - 가이드 관리 + 상품 관리 탭
   - 가이드 관리: 진열 가이드 이미지/핵심포인트/평가항목 CRUD
   - 상품 관리: 카테고리별 그룹/세부상품 추가/삭제

5. **관리자 로그인** (`/admin/login`) - 비밀번호: `ADMIN_PASSWORD` 환경변수

## DB 스키마
- `checklists`: 점검 기록 (branch, category, product, status, photoUrl, notes, items JSONB)
- `guides`: 진열 가이드 (category, product, imageUrl, points[], items[])
- `products`: 상품 카탈로그 (category, groupName, productName) — 관리자가 CRUD 가능

## 상품 저장 형식
점검의 `product` 필드 = `[groupName]productName` (예: `[한우]암소한우`)  
그룹에 세부상품 없을 경우 = `[groupName]` (예: `[양곡]`)  
가이드의 `product` 필드도 동일 형식으로 매칭.

## 인증
- 관리자 세션: express-session (`SESSION_SECRET` env) + `trust proxy 1`
- 관리자 비밀번호: `ADMIN_PASSWORD` env var

## 환경변수
- `DATABASE_URL`: PostgreSQL 연결
- `SESSION_SECRET`: 세션 암호화 키
- `ADMIN_PASSWORD`: 관리자 비밀번호 (현재: `vmd2024!`)
