import json, sys

# 메인+보조 두 텍스트 트랙 통합 (capcut texts는 두 트랙 모두 반환)
texts = json.load(open('/tmp/0531_v7.json'))
def is_empty(t): return t == "" or t.startswith('{')
texts.sort(key=lambda s: s['start_us'])

# 접속사로 시작하면 문장 경계 → 새 그룹
CONN = ('그리고', '그래서', '근데', '그러면', '그러니까', '자 ', '또 ', '그래도', '하지만', '그치만', '그러나')
def starts_conn(t):
    t = t.strip()
    return t == '자' or t == '또' or t.startswith(CONN)

# forward 누적: 짧은(≤1초) 자막을 누적. (a)텍스트 있고 >1초, (b)누적 3.5초 초과,
# (c)다음이 접속사로 시작 → 그룹 마감
groups = []
cur = None
def flush():
    global cur
    if cur is not None:
        groups.append(cur); cur = None

for s in texts:
    e = is_empty(s['text']); d = s['duration_us']; t = s['text'].strip()
    # 다음(현재) 세그먼트가 접속사로 시작하고 현재 그룹에 이미 텍스트가 있으면 먼저 마감
    if cur is not None and cur['texts'] and (not e) and starts_conn(t):
        flush()
    if cur is None:
        cur = {'segs': [s], 'start': s['start_us'], 'end': s['start_us'] + d,
               'texts': ([] if e else [t])}
    else:
        cur['segs'].append(s)
        cur['end'] = s['start_us'] + d
        if not e:
            cur['texts'].append(t)
    # 마감: 텍스트 있고 1초 초과, 또는 누적 길이 3.5초 초과
    if (not e) and (d > 1000000 or (cur['end'] - cur['start']) > 3500000):
        flush()
flush()

# 통계
orig = len(texts)
multi = [g for g in groups if len(g['segs']) > 1]
removed = sum(len(g['segs']) - 1 for g in groups)
empty_groups = [g for g in groups if not g['texts']]

print(f"원본 세그먼트: {orig}")
print(f"병합 후 그룹(세그먼트): {len(groups)}")
print(f"병합된 그룹(2개 이상 합침): {len(multi)}")
print(f"제거될 세그먼트: {removed}")
print(f"텍스트 없는 그룹(빈): {len(empty_groups)}")
print()
print("=== 병합 미리보기 (병합된 것만, 처음 45개) — [길이] 텍스트 ===")
n = 0
for g in groups:
    if len(g['segs']) <= 1:
        continue
    joined = ' '.join(g['texts'])
    dur = (g['end'] - g['start']) / 1e6
    src = ' + '.join(f'"{x}"' for x in g['texts'])
    print(f"{dur:4.1f}s  [{joined}]")
    n += 1
    if n >= 45:
        break

# 적용 데이터 생성
# 대표 = 그룹 첫 세그먼트. set-text(joined), target_timerange = start~end
settext = []   # {id, text}
timing = {}    # rep_id -> new_duration_us (start는 그대로)
remove_ids = []
for g in groups:
    rep = g['segs'][0]
    joined = ' '.join(g['texts'])
    new_dur = g['end'] - g['start']
    # 대표 텍스트가 바뀌거나 길이가 바뀌면 기록
    if len(g['segs']) > 1:
        settext.append({'cmd': 'set-text', 'id': rep['id'], 'text': joined})
        timing[rep['id']] = {'start': g['start'], 'duration': new_dur}
        for s in g['segs'][1:]:
            remove_ids.append(s['id'])

with open('/tmp/merge_settext.jsonl', 'w') as f:
    for o in settext:
        f.write(json.dumps(o, ensure_ascii=False) + '\n')
json.dump({'timing': timing, 'remove': remove_ids}, open('/tmp/merge_struct.json', 'w'), ensure_ascii=False)
print()
print(f"set-text 대상: {len(settext)}, 시간조정: {len(timing)}, 제거: {len(remove_ids)}")
