# CapCut Shorts Extraction Workflow

이 문서는 긴 CapCut 강의/녹화 프로젝트에서 주요 부분을 여러 개의 쇼츠 프로젝트로 추출할 때 따르는 별도 워크플로다. 기본 draft 생성·등록·자막 품질 규칙은 `docs/agent-rules/capcut-draft-editing-workflow.md`를 먼저 따른다.

## 0. 전제

- 쇼츠 작업 전 `docs/agent-rules/capcut-draft-editing-workflow.md`를 처음부터 끝까지 읽는다.
- CapCut 앱이 꺼져 있어야 한다.
- 최종 쇼츠는 repo `outputs/`가 아니라 CapCut 기본 draft root에 등록한다.
- 각 쇼츠 프로젝트는 독립적으로 열려야 하며, media path는 각 쇼츠 프로젝트 내부 `assets/video/` 파일을 가리켜야 한다.
- 쇼츠도 작업 후 퇴고 패스를 수행한다.
- YouTube Shorts용 MP4를 만들 때는 **반드시 세로 9:16**으로 렌더한다.
  - 기본 해상도: `1080x1920`
  - 슬라이드/피사체는 가로 원본 letterbox를 기본으로 쓰지 않는다. 단, 코딩 조작은 아래 전체 화면 보존을 우선한다.
  - 슬라이드/피사체는 내용 중심으로 배치하되 코딩·데스크톱·브라우저 조작은 전체 화면을 보존한다(workflow §2.7). 9:16에서도 메뉴가 잘리는 확대 crop을 강제하지 않는다.
  - 코딩 조작 외 구간의 레이아웃 예시: 흐림 처리한 전체 화면을 배경으로 깔고, 중앙에는 1.5~1.8배 확대 crop을 올린다.
  - 레이아웃 변경은 전/후 합성 프레임으로 먼저 확인하고 2소스 오프셋·3트랙 lockstep을 보존한다(workflow §2.7).
  - 자막은 모바일에서 읽히도록 크게 넣는다. 기본: 하단 70~82px, 검은 반투명 박스, 2줄 이하.

## 1. 쇼츠 후보 선정 기준

긴 강의에서 “주요부분”은 다음 기준으로 고른다.

1. **첫 3초 hook**이 있어야 한다.
   - 놀라운 결과: “AI 때문에 준파이어가 됐다”
   - 실패/교훈: “100% 자동화를 해봤는데 결국 신경이 더 들었다”
   - 반전/논쟁: “AI가 많아질수록 개발자는 더 필요하다”
   - 구체 숫자: “하루에 203번 요청했다”, “팀 14명, 서비스 6개”
2. 앞뒤 맥락 없이도 이해되는 30~60초 구간이어야 한다.
3. 한 가지 메시지가 명확해야 한다. 단순 소개/배경 설명만 있는 구간은 버린다.
4. 창업/사업화/usecase/ai/자동화/개발/실전 팁처럼 시청자가 저장하거나 공유할 정보가 있어야 한다.
5. 질문형 hook, 결론형 문장, 숫자, 실패담, 반전 중 하나 이상이 포함되어야 한다.
6. 무음편집 후 target timeline 기준으로 말이 끊기지 않는 구간이어야 한다.

선정 금지:

- 이름/이력 소개만 길게 이어지는 구간
- 키워드는 있지만 결론이 없는 구간
- 문장 중간에서 시작하거나 끝나 “그래서 뭐?”가 되는 구간
- 단순히 `ai`, `사업화`, `usecase` 같은 키워드가 있다는 이유만으로 뽑은 구간

후보는 최소 10개 이상 뽑고, 아래 점수로 상위권을 고른다.

| 항목 | 점수 |
| --- | --- |
| 첫 3초 hook 강도 | 0~5 |
| 메시지 완결성 | 0~5 |
| 구체성/숫자/사례 | 0~5 |
| Shorts 공유성/논쟁성 | 0~5 |
| 자막/화면 가독성 | 0~5 |

기본적으로 총점 18점 미만 후보는 만들지 않는다.

기본 생성 개수:

- 사용자가 개수를 지정하지 않으면 5개
- 길이는 35~60초 목표
- 너무 좋은 구간이 부족하면 3~5개로 줄인다.
- 사용자가 "최대한 많이" 라고 하면 18점 이상 전부 만든다(1021: 9개).

예약 공개 정책 (2026-10-23 확정):

- 쇼츠는 **해당 롱폼이 공개되는 다음 날부터 하루 1개씩 매일 18:00**(KST)에 예약한다. 순서는 후보 점수순.
- 다른 회차 쇼츠와 날짜가 겹쳐도 그대로 둔다. 하루에 여러 개가 올라가는 것을 허용한다. 이전 회차 쇼츠 뒤로 이어 붙이지 않는다.
- 업로드 절차·Aside 주의점은 `.claude/skills/clauders-video-publish/SKILL.md`.

## 2. 후보 추출 절차

1. 원본 편집 프로젝트에서 **활성 text track 기준** 자막을 추출한다.
   - `capcut texts <project>`만 단독 사용하지 않는다. 이 명령은 미사용 `materials.texts[]`까지 섞어 반환할 수 있어, 쇼츠 후보 시간이 실제 timeline과 어긋날 수 있다.
   - `draft_info.json`의 `tracks[].type == "text"` segment를 `target_timerange.start` 순서로 읽고, 각 segment의 `material_id`로 실제 text material을 찾아 `active-texts-for-shorts.json`을 만든다.
   - 후보 선정/검증은 반드시 이 활성 자막 목록 기준으로 한다.
2. keyword 후보를 찾는다.
   - `사업화`, `usecase`, `ai`, `자동화`, `개발`, `창업`, `고객`, `문제`, `제품`, `mvp`, `코드`, `비용`, `시간`, `생산`, `실무`
3. keyword 근처 앞뒤 자막을 함께 읽고 35~60초 range를 만든다.
4. keyword 후보 외에도 숫자/반전/실패/결론 표현을 별도로 찾는다.
   - 예: `때문에`, `결국`, `근데`, `문제`, `수익화`, `상용화`, `필요하다`, `하루에`, `한 달에`, `100%`, `0에 수렴`, `어렵다`
5. range는 활성 자막을 후보로 잡되 실제 발화 경계를 확인해 프로젝트 프레임에 맞춘다. 눌린 어절 시각은 workflow §3 5항의 에너지 골짜기·스니펫 재전사로 실측한다. 문장이 중간에서 끊기면 앞뒤로 확장하거나 후보를 버린다.
6. 각 후보에 제목을 붙인다.
   - 제목은 파일/프로젝트명에 쓸 수 있게 짧고 안전하게 만든다.
   - 예: `01_usecase_활용`, `02_ai_자동화_현실`.
7. 후보 목록을 `.json`으로 저장한다.
   - 필수 필드: `index`, `title`, `project_name`, `start_us`, `end_us`, `duration_us`, `why`, `hook_caption`, `hook_score`, `message_score`, `specificity_score`, `share_score`, `readability_score`, `total_score`.
   - `start_us/end_us`는 활성 text track의 `target_timerange` 기준이어야 한다.

## 3. 쇼츠 프로젝트 생성 절차

각 쇼츠는 기존 편집 프로젝트를 복제한 뒤 해당 target time range만 남긴다.

1. CapCut 기본 draft root에 새 프로젝트 폴더 생성
   ```text
   ~/Movies/CapCut/User Data/Projects/com.lveditor.draft/<short-project-name>/
   ```
2. source 프로젝트의 정상 skeleton/config를 복사한다.
3. `tracks[].segments`를 range와 겹치는 segment만 남긴다.
4. segment가 range와 일부만 겹치면 trim한다.
   - `target_timerange.start`는 `overlap_start - range_start`로 rebasing
   - `target_timerange.duration`은 overlap duration
   - video segment는 `source_timerange.start += trim_from_segment_start * speed`
   - text segment는 target timing만 조정한다.
5. project `duration`은 range 길이 또는 마지막 video end와 맞춘다.
6. 불필요한 text material은 제거한다. video material/companion material은 schema 안정성을 위해 유지해도 된다.
7. 모든 video material path/media_path를 쇼츠 프로젝트 내부 asset 절대경로로 맞춘다.
8. `draft_info.json`과 `draft_content.json`을 동일하게 저장한다.
9. `draft_meta_info.json`과 `root_meta_info.json`을 쇼츠 프로젝트 정보로 갱신한다.

## 4. 미디어 파일 처리

각 쇼츠 프로젝트 안에 원본 MP4를 둔다.

```text
<short-project>/assets/video/<원본파일명>.mp4
```

APFS 환경에서는 디스크 절약을 위해 clone copy를 사용할 수 있다.

```bash
cp -c "$source_media" "$short_project/assets/video/<file>.mp4"
```

`cp -c`가 실패하면 일반 `cp`로 복사한다.

완료 시 모든 경로가 내부 asset 절대경로여야 한다.

- `draft_info.json materials.videos[].path`
- `draft_info.json materials.videos[].media_path`
- `draft_content.json materials.videos[].path`
- `draft_content.json materials.videos[].media_path`
- `draft_meta_info.json draft_materials[].value[].file_Path`
- `root_meta_info.json` 해당 entry의 `file_Path`

## 5. 자막/스타일 규칙

- 원본 편집 프로젝트의 자막 text와 style을 유지한다.
- 쇼츠용 hook/title 자막을 새로 추가할 수 있지만, 사용자가 요청하지 않으면 원 자막만 유지한다.
- 기본 자동생성 스타일로 되돌아가면 실패다.
- 기존 reference style은 보존하되 흰 슬라이드가 있으면 검은 반투명 박스(alpha 0.6, `check_flag |= 16`)를 우선한다(workflow §5).
- MP4 직접 렌더 시 CapCut 내부 자막 스타일을 그대로 재현하기 어렵더라도 모바일 기준 가독성을 우선한다.
  - 9:16 출력 자막은 `1080x1920` 기준 font size `70~82`를 기본으로 한다.
  - 하단 safe area를 남기되 너무 아래 붙이지 않는다.
  - 3줄 이상 금지. 긴 문장은 workflow §4의 어절 시각 기반 DP 재분할·전량 정독으로 나눈다. 뜻을 바꾸는 축약은 하지 않는다. 공백 포함 한 줄 15자(영문·숫자만 0.55), 어절 흐름을 검증한다.
- 최종 MP4에는 가능하면 첫 2~3초 상단에 hook title을 넣는다.
  - 예: `AI 때문에 준파이어`, `100% 자동투자 해본 결론`, `하루 203번 AI 요청`
  - hook title은 원 자막을 대체하지 않고, 쇼츠 피드에서 첫 화면 의미를 즉시 전달하기 위한 보조 레이어다.
  - hook title 때문에 본 자막이 가려지면 안 된다.
- 자막 표기는 화면 프레임으로 확인하고 뜻을 보존한다. 불확실하면 원문 유지 + 확인 목록 보고. 군말은 오디오에서도 삭제하고 추가 무음컷은 workflow §3.3 사전 측정·교집합·재전사를 따른다.
- 자막 검증 기준은 원 workflow와 동일하다.
  - 독립 추임새/한 글자 응답어 0
  - 0.5초 미만 0 (옛 0.35초 기준 대체)
  - 7초 초과 0
  - text overlap 0
  - 3줄 이상 0
  - 오탈자/의미 오류 패턴 잔존 0

## 5b. 오디오 라우드니스 (쇼츠는 -11 LUFS)

**쇼츠는 -14 LUFS 로 내지 않는다.** 2026-10-21 사용자 지적: 1019 쇼츠(-14.5 LUFS)가 "다른 채널에 비해 너무 작다".
YouTube 정규화는 **낮추기만 하고 올려주지 않는다** — -14 는 상한이지 목표가 아니다. 쇼츠 피드의 다른 영상은
대개 -9~-11 로 압축돼 있어 바로 옆에서 비교된다.

| | 통합 | TP | 체인 |
| --- | --- | --- | --- |
| 쇼츠 | **-11 LUFS** (±0.3) | ≤ -1.0 dBTP | 2단 컴프 + 리미터 |
| 롱폼 | -14 LUFS | -1.5 dBTP | `capcut-hyperframes-recut` §오디오 |

```
atempo, highpass=f=75, volume=<-14 까지 선형>,
acompressor=threshold=-20dB:ratio=3:attack=10:release=150:knee=6,   # 몸통 모으기
acompressor=threshold=-12dB:ratio=8:attack=0.5:release=40:knee=3,   # 튀는 음절
volume=<makeup>, alimiter=limit=0.74:level=disabled:attack=0.5:release=40
```

- **리미터만 세게 밀지 마라.** 1019 목소리는 -14 LUFS 에서 샘플 피크가 +21dB 위(크레스트 21dB)라,
  리미터 드라이브 +8dB 를 줘도 -11.6 에서 막히고 이미 깎이는 중이었다(기존 체인이 6~7dB 리미팅).
  컴프로 크레스트를 먼저 줄여야 makeup 이 LUFS 로 바뀐다.
- **makeup 은 오디오만 렌더해서 찾는다.** 컴프 때문에 게인↔LUFS 가 비선형(+3dB → +0.8 LU 구간 있음)이라
  한 번 보정으로 안 맞는다. AAC 로 인코드해 재고 할선법으로 2~5회 (`outputs/1019-shorts/build_shorts.py fit_makeup`).
  영상까지 매번 다시 굽지 않는다.
- 측정은 **최종 MP4**에서 `ebur128=peak=true` 로 한다(AAC 인코드가 TP 를 올린다).
- 보고에 통합 LUFS·TP·LRA 를 같이 적는다. LRA 가 1.5 아래로 떨어지면 과압축 — 들어보고 펌핑이 있으면 makeup 을 낮춘다.

## 6. 검증 체크리스트

각 쇼츠 프로젝트마다 다음을 실행한다.

```bash
python3 -m json.tool draft_info.json >/dev/null
python3 -m json.tool draft_content.json >/dev/null
cmp -s draft_content.json draft_info.json
capcut lint <short-project>
capcut info <short-project> -H
capcut texts <short-project> > texts-after.json
capcut segments <short-project> --track video > video-after.json
```

추가 검증:

- root index에 쇼츠 프로젝트 entry가 있음
- media path가 쇼츠 프로젝트 내부 asset 절대경로
- video gap/overlap 0
- video end == project duration
- MP4를 생성했다면 해상도 `1080x1920` 또는 명시한 9:16 해상도
- MP4에 video/audio stream 둘 다 있음
- MP4 통합 라우드니스 -11 ±0.3 LUFS, TP ≤ -1.0 dBTP (§5b). -14 근처면 실패
- text overlap 0
- 자막 스타일 유지
- 후보 `start_us/end_us`와 실제 쇼츠 duration 일치

## 7. 작업 후 퇴고 패스

완료 보고 전 다음을 표로 점검한다.

| 항목 | PASS 기준 |
| --- | --- |
| 문서 준수 | 이 문서와 `capcut-draft-editing-workflow.md`를 둘 다 읽고 따름 |
| CapCut 종료 | 저장 시점 `pgrep -x CapCut` 비어 있음 |
| 후보 품질 | 각 쇼츠가 하나의 메시지를 갖고 말이 중간에 끊기지 않음 |
| 최종 위치 | 각 쇼츠가 CapCut 기본 draft root 아래 있음 |
| root 등록 | 각 쇼츠가 `root_meta_info.json`에 등록됨 |
| 미디어 내부화 | 각 쇼츠의 모든 media path가 내부 `assets/video`를 가리킴 |
| timeline | video gap/overlap 0, duration 일치 |
| 9:16 MP4 | 세로 9:16, 슬라이드/피사체 클로즈업·코딩 조작 전체 화면 보존, 가독 자막 적용 |
| 자막 | style/길이/overlap/추임새/의미 오류 기준 통과 |
| lint | 모든 쇼츠 `capcut lint` errors 0, warnings 0 |

수치 PASS여도 청감은 “사용자 확인 필요”로 보고하고 사용자 판단 항목은 한 번에 모은다. 최종 보고에는 각 쇼츠별로 다음을 포함한다.

- 프로젝트명/경로
- start/end/duration
- 선정 이유
- 자막 수
- video segment 수
- lint 결과
- media path 내부화 여부
