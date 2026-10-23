# 함정 상세

0819·0827·0905·1021 작업의 실측 함정이다. 과거 사례와 현재 대체 규칙을 구분한다.

## ffmpeg 합성

### 마스크를 `-loop 1 -i` 로 넣으면 인코드가 끝나지 않는다

루프된 이미지는 EOF 가 없다. `alphamerge` 는 framesync `eof_action=repeat` 라
무한히 프레임을 뱉고, `overlay` 는 `[bg]` 가 끝난 뒤에도 마지막 프레임을 반복하며
계속 돈다. 20분 돌려 340MB 를 쌓고도 안 끝났다.

`-loop 1` 을 빼면 이미지 1프레임 + framesync repeat 로 마스크는 그대로 유지되면서
그래프가 `[bg]` 와 함께 끝난다.

```bash
ffmpeg -i graphics.mp4 -i head.mkv -i pipmask.png \      # -loop 1 없음
  -filter_complex "\
[0:v]trim=end_frame=10940,setpts=N/30/TB[bg];\
[1:v]setpts=N/30/TB,crop=660:660:165:60,scale=360:360:flags=lanczos,format=rgba[pipc];\
[2:v]format=gray[m];\
[pipc][m]alphamerge[pipa];\
[bg][pipa]overlay=x=1504:y=664:eval=init:format=auto,format=yuv420p[v]" \
  -map "[v]" -map 1:a -frames:v 10940 ...
```

진단법: 출력 파일이 예상 길이를 넘겨서도 계속 자란다. `ffprobe` 는 `moov atom not
found` 만 뱉으니(아직 쓰는 중) 파일 크기 증가 추이로 판단한다.

### `overlay=...:shortest=1` 은 마지막 프레임 1개를 깎는다

10,940 → 10,939. `-loop 1` 을 뺀 이상 필요 없다. 길이 보증은 `-frames:v N` 하나로 충분.

### concat 컨테이너 duration 만 믿지 마라

concat demuxer 로 이어붙인 mkv 는 컨테이너 duration 이 실제와 다르게 나온다
(364.667s 인데 368.811s 로 보고). 프레임 수와 샘플 수가 진실이고,
합성할 때 `setpts=N/30/TB` 로 다시 찍는다. **원본 2소스의 audio start_time 보정은 별개로 필요하다**(아래 싱크 항목).

## HyperFrames

### `<video>` 에 `id` 가 없으면 렌더에서 얼어붙는다

```
✗ media_missing_id: <video> has data-start but no id attribute.
  The renderer requires id to discover media elements — this video will be FROZEN in renders.
```

`check` 가 **에러**로 잡는다. 안 돌렸으면 정지 화면인 채로 출고된다.

### 미디어 카드는 타입 스케일을 따로 줘야 한다

패널이 오른쪽 절반을 먹으면 텍스트 칼럼이 828px 로 줄어든다. 폰트를 그대로 두면
두 줄짜리 제목이 박스를 위로 넘겨 헤더와 겹친다.

```
✗ content_overlap #card-10-kick inside span.w — Two text blocks overlap and may render unreadable.
```

`.card.has-media` 스코프로 title/detail/items/chips/num 을 한 단계씩 낮춘다.

### 페이드 끝에는 `tl.set` 하드킬

```
✗ gsap_exit_missing_hard_kill: GSAP exit on ".card[...] .root" ends at the 115.60s
  clip start boundary without a matching tl.set hard kill.
  Non-linear seeking can land after the fade and leave stale visibility state.
```

`tl.to(..., {opacity:0}, t)` 뒤에 `tl.set(..., {opacity:0}, t+dur)` 를 건다.
되살리는 쪽도 대칭으로.

### 렌더러가 타임라인 끝에 프레임 1개를 더 붙인다

10,940 을 의도해도 출력은 10,941. 합성에서 `trim=end_frame=10940` 으로 자른다.

### 번들 폰트는 latin 전용

한글은 Pretendard woff2 를 받아 `@font-face` 로 박는다. 시스템 폰트를 `local()` 로
선언하면 lint 는 통과하지만 렌더 로그에 `Fonts FAILED` 가 뜨고 폴백으로 떨어진다.

### 경고는 남겨도 된다

`composition_file_too_large`, `timeline_track_too_dense`, `studio_missing_editable_id`
는 사람이 읽고 diff 하기 좋으라는 경고다. 생성 스크립트(`build.py`)가 진짜 소스이면
파일을 쪼갤 실익이 없다. **에러 0** 만 지키면 된다.

## 디자인

### 토큰 이름을 바꾸면 인라인 `var()` 가 조용히 죽는다

카드 호스트에 `style="--a: var(--accent-0)"` 를 박아뒀는데 팔레트를 openhow 로
갈면서 `--accent-N` 을 없앴다. 유효하지 않은 var 는 에러가 아니라 **상속으로 떨어져서**
강조색이 전부 흰색이 됐다. lint 도 대비 검사도 통과했다(흰 글자는 대비가 좋으니까).
스냅샷을 안 봤으면 그대로 렌더했다.

→ index → 색 매핑은 `ACCENTS` 리스트 한 곳에만 둔다.

### 한글 줄바꿈

`word-break: keep-all` 을 카드 텍스트 전체에. 기본값은 CJK 를 아무 데서나 끊는다.

## CapCut draft 쓰기

**앱이 열려 있으면 절대 쓰지 않는다.** `pgrep -x CapCut` 으로 확인하고 종료 후 백업한다.
md5 변경만으로 사용자 편집이라 단정하지 않는다. 아래 재저장 항목의 구조·텍스트 diff 를 따른다.

### 미러가 6개다

```
draft_info.json               Timelines/<id>/draft_info.json
draft_info.json.bak           Timelines/<id>/draft_info.json.bak
template-2.tmp                Timelines/<id>/template-2.tmp
```

전부 같은 해시였다. 하나라도 옛 상태로 남으면 다음에 앱을 열 때 그게 이겨서
편집이 조용히 롤백된다. 프로젝트마다 미러 구성이 다를 수 있으니
`shasum` 으로 같은 내용인 파일을 먼저 찾는다.

### `capcut add-video` 는 b-roll 에 그대로 못 쓴다

`src/factory.ts` 기준 두 가지가 걸린다.

- `local_material_id: ""` — 비어 있으면 CapCut 이 파일을 미디어 라이브러리에 못 붙여
  열자마자 material duration 을 0 으로 만들고 클립이 끊긴다.
- 오버레이 트랙(`flag: 2`)을 만드는 코드가 없다. 항상 `flag: 0` 메인 트랙이고,
  메인 트랙은 gap 을 허용하지 않아 띄엄띄엄 올린 b-roll 이 전부 왼쪽으로 당겨 붙는다.

### `capcut add-text` 는 자동자막과 섞이지 않는다

자동자막은 `type: "subtitle"` + 90여 개 필드. `add-text` 는 `type: "text"`.
도너 복제가 답이다.

## 2소스 리컷에서 밟은 것 (0827)

### `aselect` 가 프레임을 하나도 안 버린다

video `select` 는 정상인데 `aselect=expr=lt(t\,5)` 같은 단순식으로도 30초 소스가
30초 그대로 나온다. 오디오 컷은 `atrim`+`concat` 을 쓴다.

조용해서 무섭다 — 영상만 628s, 오디오는 907s 로 나와 컨테이너 duration 이 어긋나야
알아챈다. 컷 뒤에는 항상 `ffprobe` 로 **스트림별** duration 을 본다.

### `atrim` 의 `start_sample` 은 네이티브 스트림 기준이다

출력에 `-ar 8000` 을 걸어도 인덱스는 48000 기준으로 줘야 한다. 8000 기준으로 주면
길이가 정확히 6분의 1로 나온다.

프레임↔샘플은 정수로 — 30fps/48kHz 면 프레임당 1600샘플. `start_sample = frame*1600`.

### `alimiter` 는 `level` 이 기본 켜짐이라 0 dBTP 로 밀어올린다

`limit` 을 아무리 낮춰도 TP 가 `0.00` 으로 찍히면 이것이다.

```
alimiter=limit=0.79:level=disabled
```

0827: 게인 18.4dB + 위 리미터 → -14.29 LUFS · -1.56 dBTP · LRA 5.4.

### `-ss` 를 `-i` 앞에 두면 소스를 **앞으로 당긴다**

늦게 시작한 소스를 늦은 그대로 얹으려면 `-itsoffset` 이다. 반대로 쓰면 오프셋의
2배만큼 어긋난다. 한 프레임 스틸로는 잘 안 보이고 전체를 렌더한 뒤에야 드러난다.

**부호는 촬영마다 다르다.** 보조 소스가 기준보다 **먼저** 시작했으면(오프셋 음수)
앞을 버려야 하므로 그때는 `-ss` 가 맞다. 0827 은 화면녹화가 8.41s 늦게 시작해
`-itsoffset`, 0905 는 17.41s **먼저** 시작해 `-ss` 였다. 도구를 외우지 말고 부호를 본다.

### `sync-offset.py` 값을 `-ss`/`-itsoffset` 에 그대로 넣지 마라 — 컨테이너 audio start_time 을 더한다

`sync-offset.py` 는 **디코딩된 오디오 배열**끼리 잰다. 배열 인덱스 0 은 그 스트림의 첫
샘플이지 컨테이너 시각 0 이 아니다. 반면 `-ss`·`-itsoffset` 은 **컨테이너 시각**으로 움직인다.
두 값이 다른 파일이 있다.

0905 화면녹화(QuickTime): `video start_time 0.000000` / `audio start_time 0.077250`
(`start_pts 3708 @48kHz`). 오디오 오프셋 −17.411938 을 그대로 `-ss` 에 넣으면
**영상이 77ms(2.3프레임) 늦는다.** 타이핑·클릭이 소리보다 늦게 보인다.

```bash
ffprobe -v error -show_entries stream=index,codec_type,start_time,start_pts -of json <파일>
# video 와 audio 의 start_time 이 다르면 그 차이를 오디오 오프셋에 더한다
SS = -OFF + (audio_start_time - video_start_time)  # 기준 파일 audio/video start_time 이 같은 이 사례
```

실측 (컷본 오디오 ↔ 같은 컷을 먹인 화면녹화 오디오, 9개 구간):

| -ss | lag |
| --- | ---: |
| 17.411938 (오디오 값 그대로) | −77.27 ms |
| **17.489188** (+ audio start_time) | **−0.02 ms** |

다른 촬영은 양쪽 파일의 audio/video start_time 을 함께 읽어 **컨테이너 audio start_time 차이**를 반영한다.
CapCut 의 프레임 스냅도 구분한다: 1021 오프셋 1.809151 → 1.833333s 는 24ms, 30fps 1프레임 미만이라 정상이다.

**lag 이 모든 구간에서 똑같이 일정하면 드리프트가 아니라 이 종류의 상수 오차다.**
구간마다 다르면 클럭이 다른 것이고 그때는 리샘플을 본다.

### 보조 소스를 `select='between(t,…)'` 로 자르면 프레임이 샌다

시각 비교는 경계에서 반올림이 갈려 세그먼트마다 한 프레임씩 사라진다. 그리고 사라진
자리 **뒤가 통째로 33ms 씩 밀린다** — 뒤로 갈수록 누적된다.
0905 실측: 97 세그먼트에서 13019 대신 **13016** 프레임.

`fps=30` 뒤의 `n` 은 기준 소스의 프레임 인덱스와 같으므로 **정수 비교**로 바꾼다.

```
[0:v]fps=30,select='between(n,141,187)+between(n,194,219)+…',setpts=N/30/TB
```

`round(a*30) … round(b*30)-1` 로 만들면 합계가 기준 컷본과 정확히 일치한다.

### `setpts` 만으로는 길이가 안 변한다 — 뒤에 `fps` 를 붙여라

배속을 먹이려고 `setpts=PTS/1.1` 만 걸면 **타임스탬프만 줄고 프레임 수는 그대로**라
인코더가 30fps 로 다시 펴 버린다. 실측: 오디오는 `atempo` 로 413.6s 가 됐는데
영상만 455.0s / 13,650프레임 그대로였다 (A/V 41초 어긋남).

```
[v0]ass=…,setpts=PTS/1.1,fps=30[v]      ← fps 가 실제로 프레임을 버린다
-frames:v <원래 프레임수 ÷ 배속>
```

배속은 **네 곳을 같이** 건드린다 — 영상 `setpts`+`fps`, 오디오 `atempo`,
**자막 시각 ÷ 배속**, `-frames:v` ÷ 배속. 하나라도 빠지면 자막이 밀리거나 A/V 가 어긋난다.
검증은 `ffprobe` 로 **스트림별** duration 을 본다(컨테이너 duration 만 보면 못 잡는다).

### x264 는 홀수 폭·높이를 거부한다

```
[libx264] height not divisible by 2 (1320x853)
```

스케일 계산 결과가 홀수면 인코더가 아예 안 열린다. 종횡비를 0.1% 희생하고 짝수로 맞춘다.

### `overlay` 보조 입력의 첫 PTS 가 메인보다 크면 첫 프레임이 비어 나온다

framesync 가 보조를 기다리지 않고 메인만 내보낸다. `-frames:v 1` 스틸 테스트에서
**오버레이가 통째로 사라진 것처럼** 보인다. 보조 체인마다 `setpts=PTS-STARTPTS`.
1021 배치 mock 도 이 누락으로 화면녹화가 사라졌다. **전/후 동일 시점 합성 프레임**을
확인하되 단일 프레임 PTS 초기화를 전체 2소스 싱크 오프셋 제거로 옮기지 않는다(위 `sync-offset.py` 항목).

### target start 를 프레임마다 반올림하면 세그먼트 사이에 µs 틈이 생긴다

`1e6/30` 이 정수가 아니라서다. `f2us(a)+f2us(b) != f2us(a+b)`.
target start 는 **duration 누적**으로 잡는다. 0827 에서 트랙마다 gap 34개가 생겼다.

### 프레임 스트립을 raw 로 뽑으면 간헐적으로 빈 프레임이 섞인다

`fps=N,crop=…,format=gray` 를 `-f rawvideo` 로 받아 고정 크기로 reshape 하면
멀쩡한 프레임 사이에 std=0 인 것이 끼어 템플릿 정합이 조용히 실패한다.
정밀 스캔은 **PNG/JPEG 로 떨어뜨려** 읽는다.

### 소재를 `~/Desktop` 에 두면 **모든 클립이 "리소스를 찾을 수 없음"** 이다

macOS TCC 는 `~/Desktop`·`~/Documents`·`~/Downloads` 를 보호한다. 우리가 만든 파일에는
접근 허가 표시(`com.apple.macl` xattr)가 없어서, **터미널에서는 잘 읽히는데 샌드박스된
CapCut 만 못 연다.** 경로는 맞고 파일도 있으니 `os.path.exists` 검증은 통과한다 —
앱을 열어야만 드러난다.

0905 실측: `--no-copy-assets` 로 `~/Desktop/capcut-resources/*.mp4` 를 가리키게 했더니
트랙 4개가 전부 "리소스를 찾을 수 없음" 이었다. 같은 스크립트로 만든 0827 은 멀쩡했는데,
그건 `--no-copy-assets` 를 안 써서 소재가 프로젝트 `assets/` 안에 복사돼 있었기 때문이다.

→ **`--no-copy-assets` 를 쓰지 마라.** 프로젝트 폴더는 CapCut 이 직접 쓰는 곳이라 권한이 없다.
지금은 스크립트가 TCC 위치를 감지하면 거부하고, 만든 뒤에도 전 소재 경로를 검증해 출력한다.

### 실패한 draft 의 materials 개수를 진단 근거로 쓰지 마라

위 실패 뒤 draft 를 열어 보니 `materials.videos` 가 28개(고유 id 4개)로 불어 있었다.
스크립트를 계측해 보면 메모리상으로는 **4개가 맞다** — 즉 **CapCut 이 열면서 draft 를 다시 썼다.**
(0827 도 51개다. 정상 프로젝트다.)

**재료 복제는 실패 프로젝트에만 생기는 현상이 아니다.** 1021에서도 앱을 열기만 해도
md5 변경·video 재료의 세그먼트별 복제·자막 시각 ±1프레임 스냅이 생겼다. 이를 사용자 편집이나
생성기 실패로 단정해 재생성하지 않는다. **저장 전/후 구조·텍스트·source/target diff**를 읽고
정상 재저장이면 현재 draft 를 새 기준선으로 삼는다. 생성기 진단은 계측된 dry-run·저장 직후
백업과 비교하며 사용자 후편집은 보존한다(`two-source-recut.md` §8b).

### 전역 `capcut` 구버전은 정사각 얼굴에 타원 마스크를 만든다 (1021)

수정된 `addMask` 는 소재 크기로 나누지만 전역 설치본은 옛 캔버스 기준이다. 250×250에
width 0.5625 / height 1.0이면 141×250 타원이 된다. **레포 루트에서 빌드한 CLI**로
`node dist/index.js mask <프로젝트> <얼굴 세그먼트 id> circle --size 1.0` 을 실행한다.
캠에서 따로 크롭한 얼굴 클립에 프로젝트 생성 후 적용한다(`two-source-recut.md` §9).

## 새 CapCut 프로젝트를 손으로 만들 때 (0827-edit)

`draft_info.json` 이 valid 해도 앱이 못 열 수 있다. 기본 draft root 에 만들고
`root_meta_info.json` 목록 entry 를 등록한다. 아래는 0827-edit에서 확인한 원인이다.

### ⛔ 새 프로젝트의 미디어는 **프로젝트 폴더 안** `assets/` 에 둔다

`~/Desktop` 은 macOS TCC 로 막힌 위치다. 샌드박스된 CapCut 은 **접근이 허락된 파일만**
읽을 수 있고, 허락된 파일에는 `com.apple.macl` xattr 이 붙는다. 방금 만든 파일에는 없다
→ 프로젝트는 열리는데 클립마다 **"파일에 액세스 할 수 없음"**.

```bash
xattr <파일>     # com.apple.macl 이 있으면 허락된 것, 없으면 못 읽는다
```

기존 소재가 `~/Desktop/capcut-resources/` 에서 잘 붙는 건 그 파일들이 이미 `macl` 을
갖고 있어서다. **새로 만든 파일은 다르다.** 프로젝트 폴더는 CapCut 이 직접 쓰는 곳이라
권한 문제가 없다 — `<프로젝트>/assets/` 로 복사하고 draft_info·draft_content·draft_meta·root_meta 의
모든 미디어 경로를 프로젝트 내부 asset 절대경로로 맞춘다.

### ⛔ `draft_info.json` 의 `id` 는 `Timelines/<id>` 폴더 이름과 **같아야** 한다

이게 어긋나면 프로젝트가 목록에는 보이는데 **클릭·더블클릭에 아무 반응이 없다.**
앱이 타임라인을 못 찾고 조용히 실패한다. lint 도 못 잡는다(JSON 은 멀쩡하다).

네 곳이 전부 같은 uuid 여야 한다:

```
Timelines/<TLID>/                       ← 폴더 이름
draft_info.json                 .id     == TLID
Timelines/<TLID>/draft_info.json .id    == TLID
Timelines/project.json  .main_timeline_id == TLID
timeline_layout.json  .dockItems[].timelineIds == [TLID]
```

정상 프로젝트(0827)에서 넷이 전부 일치하는 것을 먼저 확인하고 시작한다.
타임라인 id 를 **먼저 만들고** draft 의 `id` 로도 쓴다.

### `root_meta_info.json` 의 `draft_ids` 는 uuid 목록이 아니라 **엔트리 개수**다

```json
{"all_draft_store": [ …47개… ], "draft_ids": 46, "root_path": "…"}
```

`all_draft_store` 에 엔트리를 추가하고 `draft_ids` 를 안 올리면 CapCut 이 목록 끝을
잘라서 **새 프로젝트가 안 보인다.** 타입이 int 인 걸 보고 리스트인 줄 알고 `.append` 를
시도하면 조용히 넘어가고 끝난다.

```python
if isinstance(rm.get("draft_ids"), int): rm["draft_ids"] = len(rm["all_draft_store"])
```

### 파일 구성은 **CapCut 이 직접 만든 빈 프로젝트**를 기준으로 맞춘다

남의 프로젝트에서 통째로 베끼면 옛 id 를 물고 온다. CapCut 으로 빈 프로젝트를 하나
만들어 `ls` 로 비교하는 게 가장 확실하다(0828 이 그 역할을 했다).

베껴도 되는 것: `draft_agency_config.json` · `draft_biz_config.json` · `draft_settings`.

**베끼면 안 되는 것** — 전부 새로 쓰거나 아예 두지 않는다:

| 파일 | 왜 |
| --- | --- |
| `timeline_layout.json` | 원본 **타임라인 id** 를 박고 있다 → 새 id 로 다시 쓴다 |
| `draft_virtual_store.json` | 원본 `local_material_id` 를 가리킨다 → 새 소재 id 로 |
| `key_value.json` | 원본 세그먼트 id·미디어 메타 캐시 → `{}` |
| `common_attachment/attachment_id_mapping.json` | short_id ↔ 원본 세그먼트 uuid → 빈 mapping |
| `draft.extra` | 원본 draft 에 묶인 암호화 블롭 → **아예 두지 않는다** (CapCut 이 만든 빈 프로젝트에도 없다) |
| `Timelines/<id>/attachment/patch/` | 옛 draft 통사본 2.5MB(undo 상태) → 폴더째 뺀다 |

`draft_id` 는 `draft_meta_info.json` 과 `root_meta_info.json` 엔트리가 **같아야** 한다.
`draft_timeline_materials_size` 는 미디어 파일 크기 합으로 채운다.
