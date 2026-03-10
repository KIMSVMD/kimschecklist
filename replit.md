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
1. **새 점검 등록** (`/checklist/new`) - 단계별 위저드
   - Step1: 지점 선택 (수도권/지방)
   - Step2: 점검 유형 선택 — **VM 점검 / 광고 점검 / 청소 점검** (3탭 분리)
   - Step3(VM만): 년도/월 선택 (기본값: 현재 월)
   - Step4: 카테고리 → 그룹 → 세부상품 (2단계 상품 선택, DB 기반)
   - Step5: 사진 촬영 + 가이드 확인 + 항목별 ○/✗ 평가 (ok/notok) + 제출

2. **매장 청소 점검** (`/cleaning/new?branch=X`) - 구역별 청소 점검 위저드

3. **점검 월별 피드백** (`/staff-dashboard`) - 현장 직원 대시보드
   - **VM 점검 탭**: 년도/월 선택으로 VM 점검 기록 조회 (`checklistType !== 'ad'`)
   - **광고 점검 탭**: 년도/월 선택으로 광고 점검 기록 조회 (`checklistType === 'ad'`)
   - **청소 탭**: 일별 조회 (기존)

4. **관리자 대시보드** (`/dashboard`) - 관리자 로그인 필요
   - VM 점검 탭: 년도/월 필터 + 관리자 점수(0~100) 부여 기능
   - 청소 점검 탭: 일별 현황 + 문제 목록

5. **관리자 메뉴** (`/admin/guides`) - 가이드 관리 + 상품 관리 탭

6. **관리자 로그인** (`/admin/login`) - 비밀번호: `ADMIN_PASSWORD` 환경변수

## 알림 시스템
- **관리자 알림 패널**: 새 점검/답글 알림, "전체 지우기" 버튼으로 일괄 삭제
- **직원 알림 패널**: 코멘트/답글 탭, 점수 부여 탭, **새 가이드 탭**
  - 가이드 등록/수정 시 모든 직원에게 알림 자동 발송 (7일 TTL)
  - `staffScoreNotifications` 테이블 재활용 (branch='all', targetType='guide')
  - 직원 알림 "모두 읽음" 버튼이 가이드 알림도 함께 처리
- **새 점검 등록 페이지 배너**: 해당 상품에 가이드 업데이트 알림이 있을 경우 파란 배너 표시
- **API**: `GET /api/guide-notifications` (최근 7일 가이드 알림 공개 조회)

## 항목 평가 방식
- 현장 직원: ○(일치, `ok`) / ✗(불일치, `notok`) 만 선택
- 점수: 관리자가 adminScore(0~100) 입력 — `PATCH /api/checklists/:id/score`
- 광고 점수: 관리자가 adAdminScore(0~100) 입력 — `PATCH /api/checklists/:id/ad-score`

## 광고(광고) 점검 플로우
- VM 점검 흐름 내에 광고 점검 섹션이 포함됨 (상품에 광고 가이드가 있는 경우만 표시)
- 가이드 타입: `guides.guideType` - 'vm' 또는 'ad'
  - VM 가이드: `/api/guides/product/:product/all` (guideType='vm' 필터)
  - 광고 가이드: `/api/ad-guides/:product/all` (guideType='ad' 필터)
- 광고 점검 데이터: `adItems`, `adPhotoUrls`, `adAdminScore`, `adAdminItems` (checklists 테이블)
- 관리자 채점: AdminAdScoreInput 컴포넌트 (Dashboard.tsx)

## DB 스키마
- `checklists`: VM 점검 기록 (branch, category, product, status, photoUrl, notes, items JSONB, **year INT, month INT, adminScore INT, adItems JSONB, adPhotoUrls JSONB, adAdminScore INT, adAdminItems JSONB**)
- `guides`: 진열 가이드 (category, product, imageUrl, points[], items[])
- `products`: 상품 카탈로그 (category, groupName, productName)
- `cleaning_inspections`: 청소 점검 기록 (branch, zone, inspectionTime, items JSONB, overallStatus)

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
