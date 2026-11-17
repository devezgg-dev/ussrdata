# 인민정보국 소련식 UI / 이메일 인증 / Turnstile 설정

## 1) Supabase SQL

Supabase Dashboard → SQL Editor에서 다음 파일을 실행합니다.

`supabase/migrations/202611170001_email_verification.sql`

이전 가입자가 아닌 새 가입부터 이메일 메타데이터를 이용해 프로필과 비공개 생년월일이 생성됩니다.

## 2) 이메일 인증 켜기

Supabase Dashboard → Authentication → Providers → Email
- Email provider: Enabled
- Confirm email: Enabled
- Site URL: Cloudflare Pages 배포 주소
- Redirect URLs에 `https://YOUR-PAGES-DOMAIN.pages.dev/**` 추가

Authentication → URL Configuration에서 메일 확인 후 돌아올 주소를 Cloudflare Pages 도메인으로 지정합니다.

## 3) Cloudflare Turnstile 무료 위젯

Cloudflare Dashboard → Turnstile → Add widget
- Widget mode: Managed 권장
- Hostname: 실제 Pages 도메인만 등록 (예: `your-project.pages.dev`)
- 생성된 Site Key를 Pages의 환경변수 `VITE_TURNSTILE_SITE_KEY`에 등록
- Secret Key는 Pages Settings → Variables and Secrets에 `TURNSTILE_SECRET_KEY` 이름으로 Secret 등록
- 반드시 Production과 Preview 환경을 구분해 설정

`functions/api/turnstile.ts`가 브라우저에서 받은 토큰을 Cloudflare Siteverify API에 서버 측 검증합니다. 브라우저에 Secret Key를 넣지 마세요.

## 4) 아이디(닉네임) 이메일 안내 기능

Supabase CLI에서 실행:

```bash
supabase functions deploy recover-username
supabase secrets set RESEND_API_KEY=re_xxxxxxxxx
supabase secrets set RECOVERY_FROM_EMAIL="인민정보국 <accounts@your-verified-domain.example>"
```

메일 발송은 Resend의 무료 사용량을 이용할 수 있지만, 발신 도메인 인증이 필요합니다. 도메인 인증이 없으면 실제 사용자에게 안정적으로 발송할 수 없습니다. `SUPABASE_SERVICE_ROLE_KEY`는 Supabase Edge Function이 제공하는 환경변수로만 사용하며 프론트엔드에 절대 넣지 않습니다.

## 5) Cloudflare Pages 빌드

- Framework preset: Vite
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `forum_work`가 저장소 하위 폴더일 때만 `forum_work`, 저장소 최상위가 프로젝트면 비워둠
- Node version: `.nvmrc`의 버전 사용

Pages의 환경변수:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (Publishable/anon key만)
- `VITE_TURNSTILE_SITE_KEY`

Pages Secret:
- `TURNSTILE_SECRET_KEY`

## 주의 / 남은 검증

- Supabase 기본 메일 발송기는 운영용 대량 발송에 적합하지 않을 수 있습니다. 실제 사용자 인증 전 SMTP provider를 설정하고 본인 주소로 메일 수신 테스트를 하세요.
- 비밀번호 재설정은 Supabase Auth의 `resetPasswordForEmail`을 사용합니다. 메일 템플릿과 Redirect URL 설정이 필요합니다.
- Turnstile은 최초 방문 검문과 로그인/가입 폼에서 별도로 실행됩니다. 최초 방문 통과 상태는 현재 탭 세션에만 저장됩니다.
- 기존의 닉네임 기반 내부 가상 이메일 계정은 새 이메일 로그인 방식과 호환되지 않습니다. 기존 회원은 계정 이메일 연결/마이그레이션 절차가 별도로 필요합니다.
- 이 프로젝트는 반드시 실제 Supabase 프로젝트에서 SQL 실행, 이메일 확인, Turnstile 검증, 배포 빌드까지 테스트한 뒤 운영해야 합니다.
