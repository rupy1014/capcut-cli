---
name: clauders-video-publish
description: 편집이 끝난 클로더즈 강의 영상을 YouTube에 일부공개로 올리고, 그 링크를 슬래시페이지(slashpage.com/clauders) 기수별 공지 게시판에 카드로 임베드해 게시한다. 사용자가 강의 영상 업로드, 슬래시페이지 공지 올리기, 클로더즈 게시판에 영상 공유, YouTube 일부공개 업로드를 말하면 사용한다.
---

# 클로더즈 영상 발행

편집 완료된 영상 → YouTube 일부공개 → 슬래시페이지 기수 공지 게시판 카드 임베드.

```text
1 yt-login.mjs      clauders2025 Google 계정 로그인 (최초 1회)
2 yt-upload.mjs     영상 업로드 → 일부공개 → watch URL 획득
3 sp-login.mjs      슬래시페이지 로그인 (최초 1회, 다른 계정)
4 sp-post.mjs       공지 채널 컴포저에 본문 + YouTube 카드 → 게시

정리용
  yt-delete.mjs     리허설이 남긴 초안 영상 삭제
  sp-clean.mjs      리허설이 남긴 컴포저 초안 복구
```

편집 스킬(`clauders-lecture-pipeline` 또는 `capcut-hyperframes-recut`)이 최종 MP4를 만든
**다음** 단계다. draft 수정·재렌더는 편집 스킬로 돌린다.

업로드할 **최종 파일 경로·길이·버전**을 편집 보고서와 맞춘다. 레이아웃 변경의 전/후 합성 프레임,
자막의 불확실한 표기, 청감 확인 항목을 함께 인계받는다. 수치 검증 PASS 를 청감 승인으로
올려 말하지 않는다(청감은 **사용자 확인 필요**). 사용자 판단 항목은 모아서 한 번에 보고한다.

명령의 `scripts/` 경로는 이 스킬 디렉터리 기준이다.

## 진행 상태 (2026-08-05 기준)

**2026-08-05 당시 전 구간 리허설 검증 완료, 실제 발행은 미실행이었다.**
아래 로그인·초안·기수 정보는 과거 기록이다. 현재 계정·대상 기수·기존 업로드를 확인해 이어간다.

| 항목 | 상태 |
|---|---|
| 양쪽 로그인 세션 | 확보됨 — 프로필에 저장돼 있어 재로그인 불필요 (만료되면 `*-login.mjs` 재실행) |
| 슬래시페이지 공지 게시 | 초안+카드 임베드까지 확인. `--publish` 는 미실행 |
| YouTube 업로드 | 저장 직전까지 리허설 성공. 리허설 영상은 삭제함 |

당시 재개 지점은 **2번(YouTube 업로드)**이었다. 다음 영상은 위 현재 상태 확인 후 중복 없이 진행한다.

- 대상 채널: `📣공지 (7기)` = `https://slashpage.com/clauders/n8pw9x2zjjxj12g7yrqv` (기수 바뀌면 이름으로 다시 찾을 것)
- 그 컴포저에는 사용자가 쓰던 미발행 초안 `라이브강의` 가 들어 있다. 지우지 말고 이어쓴다.
- 검증 당시 `클로더즈7기 라이브강의 1주차` 가 사용자 손으로 업로드 중이었다. 이미 채널에 있으면 2번을 건너뛰고 그 URL 로 3번만 실행한다.

## 왜 브라우저 자동화인가 (API를 쓰지 않는 이유)

Slashpage에는 공식 REST API가 있다 (`https://api.slashpage.com/v1`, 문서 `https://apidoc.slashpage.com/slashpage-api`). 그런데 둘 다 막힌다.

- **파일 업로드 미지원** — 스펙에 명시돼 있다: *"Images and files uploading is not supported yet."* 글 작성 바디는 `{title, content(markdown), fields}` JSON 뿐이다.
- **API 키 발급 불가** — 키는 Site Settings > Integrations 에서 **도메인 소유자만** 발급한다. clauders 도메인에서 우리 계정은 일반 멤버라 더보기 메뉴에 사이트 설정이 없다 (`신고하기`만 보인다).

YouTube 쪽도 Data API v3 대신 Studio 자동화를 쓴다 — API는 Cloud 프로젝트 + OAuth 동의화면이 필요하고, 심사 미완료 프로젝트는 **업로드가 강제로 비공개 잠금**되어 일부공개 링크 공유가 불가능해진다.

## 계정·프로필 (중요)

**두 계정이 다르다.** Chrome 영속 프로필을 따로 쓴다.

| 용도 | 계정 | 프로필 디렉터리 |
|---|---|---|
| 슬래시페이지 | 개인 Google 계정 | `~/.cache/slashpage-playwright/profile-chrome` |
| YouTube | `clauders2025` | `~/.cache/slashpage-playwright/profile-yt-clauders` |

두 디렉터리 모두 repo 밖이다 — 로그인 세션이 들어 있으니 커밋하지 않는다.

### Google 자동화 차단 회피

Playwright 번들 Chromium 으로 Google 로그인을 하면 *"브라우저 또는 앱이 안전하지 않을 수 있습니다"* 로 막힌다. 모든 스크립트가 아래 조합을 쓰는 이유다. **바꾸지 말 것.**

```js
channel: 'chrome',                                   // 실제 Chrome 바이너리
ignoreDefaultArgs: ['--enable-automation'],
args: ['--disable-blink-features=AutomationControlled']
```

Chromium 이 만든 프로필은 실제 Chrome 이 재사용하지 못한다. 프로필 디렉터리를 채널별로 분리한 이유다.

`playwright` 는 전역 설치돼 있고 ESM `import` 는 `NODE_PATH` 를 무시한다. `scripts/pw.mjs` 가 `createRequire` 로 로컬→전역 순서로 해석한다. 스크립트는 항상 `./pw.mjs` 에서 가져온다.

## 실행

### 1. 로그인 (최초 1회, 세션 만료 시 재실행)

```bash
node scripts/yt-login.mjs      # clauders2025 → Studio 대시보드 뜨면 자동 저장
node scripts/sp-login.mjs      # 슬래시페이지 → 세션 쿠키(acc, ref) 확인 후 자동 저장
```

둘 다 사람이 창에서 직접 로그인한다. 감지되면 스스로 닫힌다. **감지 조건을 완화하지 말 것** — 예전에 로그인 모달이 열린 순간을 로그인 완료로 오인해 Google OAuth 중간에 창을 닫아버린 적이 있다. slashpage 판정은 `slashpage.com` 도메인 쿠키 + 로그인 UI 소멸 + 새로고침 후 유지, 세 가지를 모두 본다 (`google.com` 의 `NID`/`OTZ` 쿠키를 세션으로 오인하면 안 된다).

### 2. YouTube 업로드

```bash
node scripts/yt-upload.mjs --file <영상> --title "제목" [--desc "설명"] [--publish]
```

**올리기 전에 라우드니스를 잰다** — 롱폼 -14 ±0.5 LUFS, 쇼츠 -11. CapCut 직접 export 본은 게인이 없어 작다(1021: -34.8 LUFS 로 올라갔다).
업로드 뒤에는 파일 교체가 안 된다. 보정: `docs/agent-rules/capcut-draft-editing-workflow.md` §2.8.

`--publish` 없이 실행하면 제목·아동용 여부·일부공개까지 채운 뒤 **저장 직전에 멈춘다** (리허설). 출력 마지막 줄의 `YOUTUBE_URL=` 을 다음 단계에 넘긴다.

- 채널은 **클로더즈 (Clauders.AI)**. 기존 영상 제목 관례: `클로더즈7기 라이브강의 2주차`, `클로더즈 6기 3주차 라이브강의`.
- 아동용 선택은 **필수**다. 안 고르면 다음 단계로 못 넘어간다.
- 공개범위는 반드시 **일부공개(Unlisted)**. 비공개(Private)는 외부 사이트 임베드가 재생되지 않아 게시판에서 아무도 못 본다. 채널의 기존 강의 영상도 전부 Unlisted다.
- **리허설도 파일은 실제로 올라간다.** 저장 전에 멈춰도 YouTube는 이미 바이트를 받아 `Saved as private` 초안으로 채널에 남긴다. watch URL 도 이 시점에 이미 발급된다. 검증만 했다면 반드시 지운다:

  ```bash
  node scripts/yt-delete.mjs <videoId|URL>
  ```

### 다른 채널 · 예약 공개 (2026-10-20, 오픈하우 쇼츠)

```bash
YT_PROFILE=~/.cache/slashpage-playwright/profile-yt-openhow node scripts/yt-login.mjs   # 최초 1회
YT_PROFILE=~/.cache/slashpage-playwright/profile-yt-openhow node scripts/yt-upload.mjs \
  --file clip.mp4 --title "..." --desc "..." --schedule 2026-10-21T18:00 --expect-channel 오픈하우 --publish
```

- **쇼츠 예약 정책 (2026-10-23 확정)**: 쇼츠는 **자기 롱폼이 공개되는 다음 날부터 하루 1개씩 매일 18:00**. 다른 회차 쇼츠와
  날짜가 겹쳐도 미루지 않는다 — 하루에 여러 개가 올라가도 된다(사용자: "롱폼을 자주 올리면 하루에 여러개 쇼츠가 올라가긴
  하겠지만 정책을 그렇게 잡자"). 이전 회차 쇼츠가 끝나는 날 뒤로 이어 붙이지 마라(1021 에서 그렇게 했다가 다시 잡았다).
- `--schedule` 은 계정 시간대 기준(오픈하우 = KST). 날짜·시간 칸 형식은 UI 언어를 따르므로 **칸에 든 값의 모양을 읽어 맞춘다**(한국어 `2026. 10. 21.` / `오후 6:00`). 넣은 뒤 되읽어서 다르면 저장하지 않는다.
- `--expect-channel` 이 Studio 채널명과 다르면 파일을 올리기 전에 멈춘다. 계정마다 프로필 디렉터리를 따로 둔다.
- 일괄 예약 예: `outputs/1019-shorts/upload.sh` + `schedule.json` (이미 올린 건 `uploaded.log` 로 건너뜀).
- **Studio 가 간헐적으로 CSS 없이 그려진다.** 버튼이 화면 밖으로 밀려 `click` 이 60초 타임아웃 → 스크립트는 DOM 클릭으로 넘긴다. 첫 `goto` 의 `ERR_ABORTED` 도 재시도한다.
- **실패한 시도도 파일은 이미 올라가 `초안` 으로 남는다.** 재시도 후 Shorts 탭에서 같은 제목의 `초안` 이 있는지 보고 지운다(1019 에서 5개 남았다).

### Studio 자동화 주의점

**Aside(`aside repl`)로 할 때 (2026-10-23, 1021 쇼츠 9개)** — 구현: `outputs/1021-shorts/gen_upload_js.py` + `upload.sh`.
- 로컬 파일은 repl 세션 폴더 안에서만 읽힌다 → `upload.sh` 가 세션 폴더에 하드링크한다.
- `setInputFiles` 는 Aside 1.26.1023 에서 `Cannot find context` 로 죽는다. 파일을 base64 로 1MB씩 페이지에 넘겨
  `File` → `DataTransfer` → `input.files` + `change` 이벤트로 넣는다(쇼츠·썸네일 수 MB 까지 확인). 1.5GB 롱폼은 이 방식도
  안 되니 사람이 올리고 메타데이터만 자동화한다.
- `다음` 은 체크 처리 중 늦게 살아난다. 고정 3번 누르면 초안으로 남는다(9개 중 2개) → `#second-container-expand-button` 이 보일 때까지 반복.
- 초안 삭제 확인창은 숨은 `tp-yt-paper-dialog` 가 여러 개 겹친다 — `getBoundingClientRect().width>0` 이고
  `임시본을 완전히 삭제` 문구가 있는 것을 골라 체크박스(`ytcp-checkbox-lit`) → `동영상 임시본 삭제`.
- 탭이 백그라운드면 `page.screenshot` 이 타임아웃난다. 검증은 DOM 텍스트·입력값으로 한다.

- `만들기 → 동영상 업로드` 버튼을 클릭하지 않는다. `#create-icon` 은 존재하지 않거나 0×0이다. **업로드 라우트로 직행**한다: `studio.youtube.com/channel/<id>/videos/upload?d=ud`
- Studio UI 언어는 계정 설정을 따른다 (이 계정은 **영어**). 텍스트 매칭에 기대지 말고 속성 셀렉터를 쓴다 — `tp-yt-paper-radio-button[name="UNLISTED"]`, `[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]`, `#next-button`, `#done-button` 은 언어와 무관하게 동작한다.
- 삭제 다이얼로그의 버튼 라벨은 상태에 따라 다르다 — 초안은 `Delete draft video`, 게시본은 `Delete forever`. 체크박스를 켜야 버튼이 활성화된다.
- 영상 편집 화면의 ⋮ 옵션 버튼도 `#options-button` 이 0×0이다. Save 버튼 오른쪽의 작은 아이콘을 **좌표로** 찾는다.

### 3. 슬래시페이지 게시

```bash
node scripts/sp-post.mjs --channel "📣공지 (7기)" --text "본문" --youtube "<URL>" [--publish]
```

`--publish` 없으면 초안까지만 만들고 스크린샷을 남긴다. 게시되지 않는다. 스크린샷을 눈으로 확인한 뒤에만 `--publish` 를 붙인다.

**채널은 이름으로 지정한다.** 기수마다 게시판이 새로 생성되므로 URL 하드코딩은 다음 기수에 깨진다. URL 도 받지만 예외 경로다.

## 슬래시페이지 컴포저의 함정

공지 채널은 **인라인 블록 에디터**다. 아래는 전부 실제로 부딪혀서 확인한 것들이다.

| 함정 | 실제 동작 |
|---|---|
| `새 포스트` 버튼 | accessible name 부분매칭이면 채널 전체 래퍼가 잡힌다. `exact: true` 필수. 게다가 split 버튼이라 첫 클릭은 메뉴만 연다 |
| `[contenteditable]` | 블록마다 하나씩 있다. `.first()` 는 첫 블록만 잡는다 — 캐럿·전체선택은 `.last()` 기준 |
| `Meta+A` | 현재 블록만 선택. **두 번** 눌러야 문서 전체로 확장된다 |
| 링크 변환 메뉴 클릭 | **먹지 않는다.** 클릭이 에디터 포커스를 날려 메뉴가 먼저 닫히고, URL 이 평문으로 중복 삽입된다. `ArrowDown` × N + `Enter` 로 고른다 (`요약 정보` 가 처음 하이라이트) |
| `미리보기` 옵션 | 이 컴포저에선 블록을 **삭제만 하고 아무것도 만들지 않는다.** 반드시 `카드`(index 2)를 쓴다 — 발행된 강의 글이 쓰는 것과 같은 썸네일 카드다 |
| URL 타이핑 | 변환이 **paste 이벤트**에 걸려 있어 타이핑으론 절대 안 된다. 클립보드 권한 부여 후 `Meta+V` |
| 첨부·카드 타일 | `contenteditable` **바깥** 트레이에 산다. `Backspace` 로 안 지워진다. 타일을 hover 하면 우상단에 × 가 뜬다 |
| 기존 초안 | 컴포저는 미발행 초안을 유지한다. `sp-post.mjs` 는 지우지 않고 **이어쓴다**. 사용자 초안을 덮어쓰면 안 된다 |
| 전송 버튼 | aria-label 이 없다. 툴바 행은 `[잠금][전송][드롭다운]` 이고 드롭다운이 더 좁아서, **폭 28px 이상 중 가장 오른쪽**이 전송이다 |
| `+` 블록 메뉴 | 텍스트 계열 25종뿐. 미디어·임베드 블록 타입이 없다 — 임베드 경로는 paste 변환이 유일하다 |

## 테스트 뒷정리

컴포저 초안은 채널에 남는다. 검증 실행 후에는 되돌린다.

```bash
SP_URL=<채널 URL> node scripts/sp-clean.mjs "복구할 원래 초안 텍스트"
```

텍스트 블록을 비우고 트레이 타일(영상 첨부·링크 카드)까지 제거한 뒤 지정 텍스트를 다시 넣는다. 실행 전 `before:` 출력으로 원래 내용을 확인하고, 그 값을 복구 인자로 넘긴다.

YouTube 초안도 남는다 — 위 `yt-delete.mjs` 참고.

## 하지 말 것

- 확인 없이 `--publish` 붙이기. 공지 게시판은 94명이 보는 공개 발신이다.
- 사용자의 기존 컴포저 초안 덮어쓰기·삭제.
- 프로필 디렉터리를 repo 안으로 옮기기 (세션 쿠키가 들어 있다).
- Playwright MCP 설치. `node` + `./pw.mjs` 로 쓴다.
