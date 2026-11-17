# Cloudflare Pages + Supabase 배포 체크리스트

## 필수 구성
- Cloudflare Pages: Vite 정적 빌드 (`npm run build`, output `dist`)
- Supabase PostgreSQL/Auth/Storage
- Supabase Edge Function `admin-delete-user`

## 순서
1. Supabase 프로젝트 생성
2. SQL Editor에서 `supabase/migrations/202611130001_cloudflare_supabase_foundation.sql` 실행
3. Authentication → Providers → Email 활성화 및 Confirm email 비활성화
4. Authentication → URL Configuration에 Pages URL 추가
5. 첫 계정 생성 후 해당 UUID를 `admin_roles`에 SQL로 직접 추가하고 프로필 status를 active로 변경
6. `supabase functions deploy admin-delete-user` 배포
7. Cloudflare Pages에 GitHub 저장소 연결
8. Build command `npm run build`, output `dist`, Node 22+ 설정
9. Production/Preview 환경변수 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 설정
10. 재배포 후 가입/로그인/게시물 권한 테스트

## 보안 주의
- `service_role`, DB password, JWT secret은 절대로 `VITE_*` 변수로 설정하지 않습니다.
- 이메일 없는 가입은 내부 `.invalid` 별칭 이메일을 사용합니다. 메일 기반 비밀번호 복구가 불가능합니다.
- 계정 삭제는 Edge Function을 통해서만 수행합니다.
- 비밀등급 접근은 DB RLS로 검증하며 UI 필터링만 믿지 않습니다.
- 현재 모든 기존 관리 기능이 원격화된 것은 아닙니다. README의 '현재 구현 범위와 배포 전 확인'을 확인하십시오.
