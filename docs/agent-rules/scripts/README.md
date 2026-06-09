# 참고 스크립트 (자막 병합 / 줄바꿈)

0531 프로젝트 자막 정리 작업에서 **일회성으로 쓴 원형 스크립트**입니다. 코드화(서브커맨드/lint 룰)의 출발점으로 참고하세요.

> ⚠️ 경로 하드코딩: `/tmp/0531_v7.json`(= `capcut texts <project>` 출력), `/tmp/merge_*.json` 등 작업 당시 임시 경로가 박혀 있습니다. 그대로 실행용이 아니라 **로직 참고용**입니다.

## 파이프라인 (1초 이하 자막 병합)

```
capcut texts <project> > 0531_v7.json     # 입력: id/start_us/duration_us/text (메인+보조 트랙 합산)
        │
        ▼
merge_subs.py   ── forward 병합 그룹핑 ──▶  merge_settext.jsonl + merge_struct.json
        │   (짧은 자막 누적 → 텍스트>1초 / 누적 3.5초 / 접속사 시작 에서 마감)
        ▼
capcut batch <project> < merge_settext.jsonl   # 대표 세그먼트 텍스트 통합 (range 스타일은 set-text가 처리)
        ▼
apply_merge.py <draft_info.json>           # draft 직접 편집: 대표 target_timerange 갱신 + 흡수 세그먼트 제거
        ▼
merge2.py  ── backward 2차 ──▶  남은 1초 이하를 직전 자막에 흡수 (중복 텍스트는 시간만)
        ▼  (다시 capcut batch + apply_merge.py)
wrap_meaning.py ── 의미 단위 줄바꿈 ──▶  wrap2.jsonl ──▶ capcut batch
```

## 파일

- **`merge_subs.py`** — forward 병합 그룹핑. 접속사(`그리고/그래서/자…`) 경계 + 1초/3.5초 마감. 대표=그룹 첫 세그먼트, 타이밍=그룹 start~end. 출력: set-text JSONL + `{timing, remove}` 구조.
- **`apply_merge.py`** — `merge_struct.json`(timing/remove)을 받아 `draft_info.json` 의 두 텍스트 트랙 `segments`에서 제거 id 삭제 + 대표 `target_timerange` 갱신. `json.dump(..., ensure_ascii=False)`.
- **`merge2.py`** — backward 2차. forward 후 남은 1초 이하 자막을 직전 자막에 흡수(텍스트가 직전 끝과 중복이면 시간만 흡수).
- **`wrap_meaning.py`** — 의미 단위 줄바꿈. 경계 점수: 접속사 앞(+) / 종결·연결어미 뒤(+) / 조사·관형형·1글자·의존명사 앞·영어 복합어(−). 1줄 ~20자, 자막당 1~2문장.

## 한계 / 개선 여지

- `wrap_meaning.py` 는 형태소 분석 없이 규칙 기반 → `라고/하는` 같은 모호 경계는 어색할 수 있음. konlpy/형태소 분석기 붙이면 정확도↑.
- 병합 그룹핑 임계(1초/3.5초)·줄바꿈 임계(20자)는 상수. 옵션화 가치.
- set-text(검증된 텍스트 갱신) + draft 직접 편집(시간/제거)으로 2단계인 이유: capcut-cli 에 세그먼트 **삭제** 명령이 없기 때문. 정식 `merge`/`tidy` 서브커맨드가 생기면 한 단계로 통합 가능.
