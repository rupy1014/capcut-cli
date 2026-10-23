# 1회 설치 절차

`scripts/check-deps.sh`가 빠졌다고 알려준 것만 설치한다. **에이전트가 임의로 brew/pip 설치를 실행하지 않는다** — 사용자에게 아래 명령을 보여주고 승인받는다.

## rclone (Google Drive)

```bash
brew install rclone
```

`clauders2025@gmail.com` 계정 연결. OAuth는 브라우저 창을 띄우므로 **사용자가 직접** 실행한다 (Claude Code 프롬프트에 `! ` 접두사를 붙이면 이 세션에서 실행된다). 대화형 마법사(`rclone config`) 대신 한 줄로 끝난다 — 나머지 질문은 기본값이 잡힌다.

```bash
rclone config create clauders drive scope=drive.readonly
```

브라우저가 `127.0.0.1:53682`로 열리면 **clauders2025@gmail.com을 선택**한다(다른 계정이 로그인돼 있으면 계정 전환). 읽기 전용 scope라 실수로 원본 녹화본을 지울 수 없다.

확인:

```bash
rclone lsd clauders:                    # 최상위 폴더 목록이 나오면 성공
rclone lsd "clauders:Meet Recordings"   # 기수별 영상 폴더
```

> **client_id 경고(기존 설치 문서 기록)**: 공용 client_id 폐지 예정 NOTICE가 관측됐다. 현재 유효 여부를 날짜만으로 단정하지 않고 실제 rclone 결과로 확인한다. 인증 실패·속도 저하가 공용 client_id 때문으로 확인되면 <https://rclone.org/drive/#making-your-own-client-id> 대로 개인 client_id를 만들어 `rclone config update clauders client_id=... client_secret=...` 로 넣는다.

토큰은 `~/.config/rclone/rclone.conf`에 저장되고 자동 갱신된다. 재로그인은 만료됐을 때만.

**주의**: `rclone.conf`에는 refresh token이 평문으로 들어간다. 이 파일을 repo에 커밋하지 않는다.

## 자막 — 설치할 것 없음

초기 자막은 **CapCut 앱의 자동 자막(음성 인식)** 으로 만든다. 이 단계만을 위한 STT 설치는 필요 없다. 편집 검증의 whisper 재전사·Silero VAD는 별도이며 아래를 따른다.

파이프라인은 3단계에서 멈추고, 사용자가 앱에서 자막을 생성한 뒤 `check-captions.py`로 이어받는다. 자세한 흐름은 `SKILL.md`.

## 나머지

이미 설치돼 있어야 하는 것들 (2026-08-04 기준 전부 확인됨):

| 도구 | 버전 | 용도 |
| --- | --- | --- |
| `ffmpeg` | 8.0.1 | 라우드니스 측정·정규화, silencedetect, wav 디코드 |
| `auto-editor` | 29.3.1 | 무음 keep range (Premiere XML) |
| `capcut` | — | draft 읽기/쓰기, lint |
| `python3` | — | 5·6단계 스크립트 (표준 라이브러리 + numpy) |

## 편집 검증 도구와 설치 범위

- **Playwright MCP** — 금지 (글로벌 규칙)
- **Silero VAD** — 공백·숨소리 컷의 세 근거 교집합 판정에 필요하다.
- **whisper 재전사** — 0.3초 이상 공백 컷의 거부권, 눌린 어절 경계 실측, 적용 전 모든 join 앞뒤 문장 확인에 필요하다. 초기 자막을 대체하는 용도가 아니다.
- 먼저 기존 실행 환경을 찾는다. 없으면 설치 범위·승인을 한 번에 확인하고, 준비되지 않은 검증을 생략한 채 PASS로 보고하지 않는다. 상세는 `../SKILL.md` 5·6단계와 `../../capcut-silence-editing/SKILL.md`.
- 원형 마스크 작업은 레포에서 빌드한 `node dist/index.js`를 쓴다. 전역 `capcut` 설치본의 옛 마스크 동작을 사용하지 않는다.
