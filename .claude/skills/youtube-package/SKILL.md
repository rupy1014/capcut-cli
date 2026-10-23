---
name: youtube-package
description: 완성된 영상의 유튜브 패키징을 만든다 — 1280×720 썸네일(좌측 대형 키워드 + 우측 인물 컷아웃)과 제목·설명·태그·챕터. 사용자가 썸네일 만들어달라, 썸네일 문구 뽑아달라, 제목/설명란/태그 정해달라, 유튜브 올릴 문구, 메타데이터, SEO 최적화를 말할 때 사용한다. 업로드 자체는 clauders-video-publish.
---

# youtube-package

영상은 끝났고 유튜브에 올릴 **껍데기**를 만든다. 썸네일 한 장 + 제목·설명·태그·챕터.

- 포맷과 규칙은 `~/sideProjects/youtube` 에서 가져왔다 —
  `docs/youtube-thumbnail-guide.md`(썸네일), `.claude/agents/seo-optimizer.md`(메타데이터).
  거기는 Remotion, 여기는 HyperFrames 라 렌더만 갈아끼웠다.
- 실제 업로드와 슬래시페이지 공지는 `clauders-video-publish`.
- 영상 만들기는 `capcut-hyperframes-recut`.

레퍼런스 구현: `overlays/0819-ai-study/thumb/` + `overlays/0819-ai-study/youtube.md`.

내용·챕터의 기준은 **실제로 남은 최종 영상**이다. 즉흥 강의의 대본은 용어·표기 근거로만
쓰고 대본 순서에 맞춰 주장·챕터를 만들지 않는다. 고유명사·파일명은 화면녹화 프레임으로
확인한다(goal.md·getdesign.md·Mobbin 등). 뜻을 바꾸는 교정은 금지하며 확신 없으면
원문을 유지하고 사용자 판단 항목을 모아서 한 번에 보고한다.

## 썸네일

`좌측 대형 키워드 + 우측 인물` 고정. 1280×720 PNG.
빌더는 `assets/build_thumb.py` (프로젝트에 복사해 쓴다). 상세는 `references/thumbnail.md`.

```bash
cp <skill>/assets/build_thumb.py thumb/
mkdir -p thumb/{props,people,fonts,out}
# Pretendard 700/800 을 thumb/fonts/ 로, 인물 컷아웃을 thumb/people/ 로
python3 thumb/build_thumb.py            # props/*.json 전부 렌더
```

props 하나가 썸네일 하나다.

```json
{ "thumbnailText": "초보자 ai\n공부법 4가지",
  "subtitle": "130명을 가르치며 정리한 것",
  "person": "openhow-calm.png" }
```

### 인물 컷은 영상에서 뽑는다

채널 주인의 얼굴을 쓴다. 스톡이나 생성 이미지가 아니다.

```bash
ffmpeg -ss <t> -i work/head.mkv -frames:v 1 cand.png          # 후보 여러 장
npx hyperframes remove-background cand.png -o cut.png          # 로컬 모델, 키 불필요
```

후보를 **contact sheet 로 모아 보고 고른다.** 눈이 보이고, 입이 이상한 모양이
아니고, 표정이 죽지 않은 컷. 발화 중 프레임은 입이 벌어져 어색한 경우가 많다.
컷아웃은 alpha bbox 로 트림해 두면 배치가 쉽다 (PIL `getbbox`).

**시선 방향을 본다.** 화자가 왼쪽을 보면 인물을 오른쪽에 두어야 시선이 키워드로
향한다. 반대면 좌우를 뒤집는 대신 다른 컷을 찾는다 — 뒤집으면 글씨가 있는 배경이나
가르마가 어색해진다.

## 제목 · 설명 · 태그

`references/metadata.md` 에 규칙과 템플릿. 요지만:

| | 규칙 |
| --- | --- |
| 제목 | 70자 이내. **숫자/결과물 필수.** 추상적 제목 금지 |
| 설명 | 300~500자. 1줄 호기심 질문 → 2~3줄 요약 → 챕터 → 해시태그 5~8개 |
| 태그 | 20~30개, 합계 500자 이내. 채널고정 / 주제 / 현실연결 / 롱테일 4그룹 |
| 썸네일 문구 | 한 줄 8자 이내, 2줄. 마지막 줄이 accent |

**카드형은 최종 타임라인에 맞춘 storyboard 에서 챕터 후보를 뽑는다.** 아래 코드는
카드형 예시다. 컷·배속 전 시각을 그대로 쓰지 말고 최종 MP4 에서 시작 장면을 확인한다.
카드 없는 즉흥 강의는 최종 영상의 실제 내용 전환으로 잡는다.

```python
from content import SECTIONS
sb = json.load(open("storyboard.json")); order = [c["id"] for c in sb["cards"]]
cards = {c["id"]: c for c in sb["cards"]}
for first, label in SECTIONS:
    t = cards[order[first-1]]["startSec"]
    print(f"{int(t)//60:02d}:{int(t)%60:02d} {label.split(' · ')[1]}")
```

## 금지

`youtube` 프로젝트의 내레이션 규칙 연장이다. 어기면 채널 톤이 깨진다.

- **겁주기·극적 문구 금지** — "큰일 납니다", "지금부터가 진짜", "모르면 손해" 류.
  키워드는 사실·결과·숫자로 뽑는다.
- **추상적 제목 금지** — 주제가 바로 보여야 한다.
- **채널명·로고를 썸네일에 박지 않는다** (현재 컨벤션).
- **영상에 없는 걸 쓰지 않는다.** 제목·썸네일이 약속한 것은 영상 안에 있어야 한다.
  숫자는 영상에서 실제로 말한 숫자를 쓴다.

## 검수

- **업로드할 MP4 의 라우드니스를 먼저 잰다.** 롱폼 -14 ±0.5 LUFS / TP ≤ -1.0, 쇼츠 -11. CapCut 에서 바로 export 한
  파일은 게인이 없어 매우 작다(1021: -34.8 LUFS 로 업로드됨). 보정 절차:
  `docs/agent-rules/capcut-draft-editing-workflow.md` §2.8. 유튜브는 업로드 뒤 파일 교체가 안 된다.

- 썸네일의 좌측 키워드/우측 인물 배치는 본편 화면녹화 배치 규칙이 아니다. 본편은
  `../capcut-hyperframes-recut/references/two-source-recut.md` §8-1의 장면별 배치를 따른다.
- 썸네일은 **작게 놓고 본다.** 유튜브 그리드에서는 320px 남짓이다.
  contact sheet 를 만들어 그 크기로 읽히는지 확인한다.
- 한 줄 9자를 넘기면 텍스트 박스를 벗어나 인물 위로 넘친다. 빌더가 경고를 찍는다.
- 인물 `height:100%` 는 정수리를 자른다. 컷아웃 bbox 가 곧 머리끝이기 때문이다.
  88% + bottom 앵커가 기본값.
