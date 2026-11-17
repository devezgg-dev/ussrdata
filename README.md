# 인민정보국 — Cloudflare Pages + Supabase

익명 닉네임 기반 커뮤니티 프런트엔드입니다. 정적 프런트엔드는 Cloudflare Pages에서 빌드·배포하고, 인증·PostgreSQL·RLS·실시간 동기화·이미지 저장은 Supabase를 사용합니다.

## 기술 구성

- React 19 + TypeScript + Vite + Tailwind CSS
- Cloudflare Pages: `dist/` 정적 배포, SPA fallback
- Supabase Auth: 이메일 입력란 없는 닉네임/비밀번호 로그인 (Supabase 내부에는 전달 불가능한 `.invalid` 별칭 사용)
- Supabase PostgreSQL: 프로필, 포럼, 게시물, 댓글, 좋아요, 구독, 보안인가, 관리자 로그
- Supabase RLS: 비밀등급 서버 측 열람 제어
- Supabase Storage: 게시물 이미지 (`forum-uploads`, 파일당 10MB)
- Supabase Edge Function: 관리자 계정 삭제 (service role 키는 함수 비밀값으로만 사용)

## 1. Supabase 프로젝트 준비

1. https://supabase.com 에서 프로젝트를 생성합니다.
2. **SQL Editor**에서 `supabase/migrations/202611130001_cloudflare_supabase_foundation.sql` 전체를 실행합니다.
3. **Authentication → Providers → Email**에서 Email provider를 활성화합니다.
4. 이 프로젝트는 가입 화면에서 이메일을 받지 않습니다. Supabase 내부용 가명 이메일을 쓰므로 **Confirm email을 비활성화**해야 합니다. 사용자가 실제 이메일을 입력하거나 수신하지 않습니다.
5. **Authentication → URL Configuration**에서 Cloudflare Pages 도메인을 Site URL 및 Redirect URLs에 등록합니다.
6. **Project Settings → API**에서 Project URL과 publishable key(또는 anon key)를 준비합니다.

> 주의: `.invalid` 도메인은 실제 메일 수신용이 아닙니다. 비밀번호 재설정 이메일은 사용할 수 없으므로, 계정 복구 절차는 별도 관리자 확인 흐름으로 설계해야 합니다. 닉네임은 가입 후 변경할 경우 로그인 별칭과 동기화하는 별도 구현이 필요합니다. 현재 닉네임 변경은 Supabase Auth 내부 별칭을 갱신하지 않으므로 배포 전 비활성화하거나 함께 구현해야 합니다.

## 2. 최초 관리자 지정

1. 사이트에서 첫 계정을 가입합니다.
2. Supabase **Authentication → Users**에서 해당 사용자의 UUID를 복사합니다.
3. SQL Editor에서 아래를 실행합니다.

```sql
insert into public.admin_roles(user_id)
values ('여기에-첫-관리자-UUID')
on conflict (user_id) do nothing;

update public.profiles
set status = 'active'
where id = '여기에-첫-관리자-UUID';
```

관리자 권한은 `admin_roles` 테이블로만 부여됩니다. 프런트엔드에서 임의로 관리자 권한을 올릴 수 없습니다.

## 3. 계정 삭제 Edge Function 배포

계정 삭제는 Supabase Auth Admin API가 필요하므로 브라우저에서 실행하면 안 됩니다.

Supabase CLI가 설치된 로컬 환경에서 프로젝트 루트 기준으로 실행합니다.

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy admin-delete-user
```

Supabase Edge Functions의 기본 환경변수 `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`를 사용합니다. service role 키를 `.env`, Cloudflare Pages 변수, 프런트엔드 코드에 넣지 마세요.

## 4. Cloudflare Pages 배포

1. GitHub에 이 프로젝트를 push합니다.
2. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. 빌드 설정:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node.js: 22 이상
4. Pages → Settings → Environment variables에서 Production과 Preview 양쪽에 다음 값을 등록합니다.
   - `VITE_SUPABASE_URL` = Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = Supabase publishable/anon key
5. 재배포합니다.

`VITE_` 변수는 브라우저에 공개됩니다. 여기에 넣을 수 있는 키는 Supabase publishable/anon key뿐입니다.

## 5. 로컬 개발

```bash
cp .env.example .env.local
# .env.local에 Supabase URL과 publishable/anon key 입력
npm install
npm run dev
```

빌드 검증:

```bash
npm run lint
npm run build
```

## 데이터 보안 설계

- 생년월일은 공개 `profiles` 테이블과 분리된 `private_birthdates`에 저장하고 본인만 조회할 수 있습니다.
- 비밀등급은 DB RLS로 제어합니다. 게스트는 4·5급, 기본 3급 인가 회원은 3~5급, 2급 인가 회원은 2~5급, 1급 인가 회원은 전체 등급을 볼 수 있습니다. CS(1급) 열람은 별도 허용 목록에도 부여할 수 있습니다.
- 게시물 등급은 작성 시 1회 선택하고, 이후 변경은 관리자 RPC/DB 트리거만 허용합니다.
- 관리자 권한·인가 변경·CS 열람권한 변경은 서버 측 RPC에서 재검증합니다.
- 계정 삭제는 관리자 Edge Function에서 호출자 JWT와 관리자 권한을 확인한 뒤 처리합니다.
- 로그인 토큰 원문은 관리자 화면에 노출하지 않습니다. 추후 확장 프로그램용 인증은 별도 짧은 수명의 토큰을 발급하고 폐기하는 방식으로 추가해야 합니다.

## 현재 구현 범위와 배포 전 확인

Supabase Auth, 프로필/가입 승인, 포럼·게시물·댓글 조회, 게시물/댓글 작성 및 일부 수정·삭제, 좋아요, 비밀등급 RLS, 보안인가/CS 권한 RPC, 관리자 계정 삭제 Edge Function을 연결했습니다.

다만 기존 앱에 있던 모든 관리 기능이 아직 Supabase로 완전히 이전된 것은 아닙니다. 특히 타임아웃·경고·일부 휴지통/복구·칭호 관리·방문 통계·전체 관리자 감사로그 화면·게시물 투표·실시간 구독은 추가 DB 연결이 필요합니다. 이 기능들은 브라우저 local state에 남아 있을 수 있으므로, 이를 운영 데이터로 간주하기 전에 추가 이전과 테스트를 완료해야 합니다.

또한 가입 이메일 별칭은 닉네임의 해시로 생성됩니다. 닉네임 변경 기능은 현재 별칭과 동기화되지 않으므로 실제 운영 전까지 제한하는 것이 안전합니다.

## 소련식 디자인 / 이메일 인증 / Cloudflare Turnstile

추가 설정은 `SOVIET_AUTH_SETUP_KO.md`를 따라 진행하세요. Turnstile 검증은 Cloudflare Pages Function(`/api/turnstile`)에서 서버 측으로 처리합니다. 이메일 가입·로그인 및 비밀번호 재설정은 Supabase Auth를 사용하며, 공개 프로필에는 이메일을 저장하지 않습니다.
