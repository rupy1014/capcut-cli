# AGENTS.md — capcut-cli repo instructions

이 파일은 repo 루트와 하위 디렉터리에 적용된다. 상세 CapCut 편집 지침은 AGENTS.md에 직접 두지 않고 별도 문서로 관리한다.

## Upstream 동기화 (renezander030/capcut-cli)

이 레포는 `renezander030/capcut-cli`의 fork다. 리모트 구성:

- `upstream` = `https://github.com/renezander030/capcut-cli.git` — 원본, 최신을 여기서 받는다.w
- `origin` = `https://github.com/rupy1014/capcut-cli.git` — 내 fork, 개인 변경 백업처.

**사용자가 "git pull 해줘"라고 하면 origin이 아니라 upstream 최신을 받는다:**

```bash
git fetch upstream && git merge --ff-only upstream/master
```

- `--ff-only`로 fast-forward만 허용한다. 개인 커밋과 갈라지면 자동 merge/rebase하지 말고 멈춰서 알린다.
- 개인 파일(`AGENTS.md`, `docs/agent-rules/`, `skills/` 등)은 master에 커밋해도 upstream 경로와 겹치지 않아 FF가 막히지 않는다.
- 스크래치/생성물(`temp/`, `outputs/`, `images/`, `.omj/`, `.DS_Store`)은 `.gitignore`라 동기화에 영향 없다.

## CapCut draft 작업 필수 진입점

CapCut draft 생성/편집/무음편집/자막 교정/TTS-first 영상 생성 작업을 시작하기 전에 아래 파일을 **처음부터 끝까지 읽고 따른다**.

- `docs/agent-rules/capcut-draft-editing-workflow.md`

CapCut draft **무음편집**은 draft 편집이면서 오디오 컷 편집이다. 따라서 `0703 프로젝트에 무음편집해줘`처럼 기존 draft의 무음 삭제를 요청받으면 아래 두 파일을 모두 처음부터 끝까지 읽고, 두 문서의 더 보수적인 규칙을 함께 적용한다.

- `docs/agent-rules/capcut-draft-editing-workflow.md`
- `docs/agent-rules/audio-breath-aware-silence-editing.md`

현재 규칙 포인터(2026-10-23): workflow §2.7(2소스 싱크·PiP·화면 배치), §2.8(CapCut export 본은 업로드 전 라우드니스 측정·보정 — 롱폼 -14 LUFS), §3.3(임계 사전 측정·교집합 컷), §3 5항(재발화), §4(자막 퇴고·어절 재분할), §5(검은 박스), §1·§8(앱 재저장·전후 합성 프레임·보고)을 따른다.

무음 분석 우선순위:

1. 실제 원본 오디오/영상에서 임계별 추가 삭제 구간의 30ms 음성대역 RMS 최대값을 전수 측정한 뒤 임계를 고른다. `auto-editor --margin 0.06s,0.08s --edit audio:-28dB`는 비교 시작값이며 사전 측정 없이 적용하지 않는다(파일 피크 기준). 상세: workflow §3.3.
2. 단일 auto-editor 컷은 `--export premiere`의 `clipitem in/out`을 keep range로 쓰고 silence-only 길이를 preview와 1프레임 이내로 맞춘다. §3.3 교집합 컷은 원시 XML 길이에 억지로 맞추지 않고 최종 확정 컷 목록과 draft를 대조한다.
3. 같은 내용을 다시 말한 경우 자막만 숨기지 않는다. 앞 실패 발화의 source interval을 오디오에서도 삭제하고 뒤 성공 발화를 보존한다.
4. 발음이 코맹맹이처럼 들리거나 끝음절이 잘렸다는 지적이 있으면 먼저 `-24dB/25ms` 같은 과격한 자체 컷을 폐기하고 해당 녹음에서 발음 보존이 검증된 기준선으로 복구한다. `-28dB` 복구도 1항 사전 측정을 통과해야 한다. `-35dB` 전체 재생성은 비교본이며, 기존 재녹음 컷을 되살리거나 사실상 무편집 상태를 최종본으로 만들면 안 된다.
5. `ffmpeg silencedetect` 같은 직접 dB threshold 컷은 fallback으로만 사용한다. `-24dB` 자동 승격은 금지한다.
6. CapCut 자동자막 타임라인은 무음 분석 근거로 쓰지 않는다. 실제 오디오 접근이 macOS 권한 등으로 막히면 접근 가능한 프로젝트 내부 미디어/사용자 제공 복사본을 먼저 찾고, 그래도 없으면 blocker로 보고한다. 자막 구간을 speech proxy로 삼아 임의 편집하지 않는다.
7. "숨소리·버벅임 때문에 답답하다/더 강하게"는 임계 강화가 아니다. 기본값 적용 전에 임계별 추가 삭제 구간의 레벨을 전수 측정하고(피크 기준 dB라 발화를 지울 수 있다), auto-editor 공백 ∩ Silero VAD 비발화 ∩ 어절·소리 밖의 교집합만 자르며, 군말은 오디오에서도 지운다. 상세: `capcut-draft-editing-workflow.md` §3.3.
8. draft를 저장하기 전후에는 CapCut 앱 종료 확인, 백업, timeline gap/overlap, duration, lint, 선택한 편집 계획과 preview 길이 일치, 재녹음 오디오 삭제, 퇴고 패스를 수행한다. source/target 경계는 프로젝트 timebase 프레임에 맞춘다. CapCut open → close round-trip 검증은 선택사항이며 기본값은 실행하지 않는다. 사용자가 요청했거나 앱의 자동 재작성 문제를 진단할 때만 수행한다.

특히 새 CapCut 프로젝트를 만들 때는 위 문서의 다음 항목을 반드시 지킨다.

- 최종 프로젝트는 CapCut 기본 draft root 아래에 둔다.
- `root_meta_info.json`에 목록 entry를 등록한다.
- MP4 등 미디어 파일은 프로젝트 내부 `assets/video/`로 복사한다.
- `draft_info.json`, `draft_content.json`, `draft_meta_info.json`, `root_meta_info.json`의 모든 media path가 프로젝트 내부 asset 절대경로를 가리키게 한다.
- 완료 보고 전 `작업 후 퇴고 패스`를 실행하고 PASS/FAIL 결과를 보고한다.

## 오디오 파일 무음편집 필수 진입점

CapCut draft가 아니라 `~/Desktop/음성녹음` 같은 폴더의 음성파일을 파일별로 무음편집하거나, 사용자가 숨소리/호흡까지 잘라 달라고 요청하면 아래 파일을 **처음부터 끝까지 읽고 따른다**.

- `docs/agent-rules/audio-breath-aware-silence-editing.md`

현재 기본 선호는 오픈소스 엔진 우선 + 발음 보존이다.

- `auto-editor` 또는 `Silero VAD`를 먼저 사용하고, 직접 만든 dB threshold 컷은 fallback으로만 쓴다.
- 2026-06-24 확인 프로파일(2026-10-22부터 사전 측정 후 채택)은 `auto-editor --margin 0.06s,0.08s --edit audio:-28dB`이다. 0.3초 호흡도 삭제되도록 margin 총합을 0.14초로 둔다.
- 2026-07-27 확인: 코맹맹이 증상의 원인이 `-24dB/25ms` 자체 컷이면 해당 녹음에서 검증된 기준선으로 복구한다. `-28dB/60ms·80ms`도 사전 측정 없이 재적용하지 않는다. 무조건 `-35dB`로 낮추면 편집량과 재녹음 컷을 잃을 수 있다.
- `auto-editor --margin 0.06s,0.10s --edit audio:-35dB`는 기본값이 아니라 발음보존 비교본이다. 채택하더라도 기존 수동/재녹음 source cut을 반드시 다시 합성한다.
- `Silero VAD`는 숨소리 교집합 컷의 필수 근거이며(workflow §3.3), 단독 발음보존 비교본의 speech padding은 앞 `120ms`, 뒤 `180ms`부터 시작한다.
- 원본은 덮어쓰지 않고 결과 폴더에 `<원본stem>_breath03cut.m4a`, `report.json`, `summary.md`를 만든다.
- 완료 전 디코드 검증을 수행하고, `-28dB/0.08초` 및 `-35dB/0.12초` 잔존 수는 참고 지표로 보고한다. 발음 보존을 해치면서까지 0개를 강제하지 않는다.
