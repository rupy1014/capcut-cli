import json
t = json.load(open('/tmp/0531_v8.json'))
def emp(x): return x == '' or x.startswith('{')
segs = [s for s in t if not emp(s['text'])]
segs.sort(key=lambda s: s['start_us'])

# backward 병합: 1초 이하 자막을 직전 자막에 흡수
result = []
for s in segs:
    if result and s['duration_us'] <= 1000000:
        P = result[-1]
        xt = s['text'].strip()
        # 중복(직전 끝이 동일)이면 텍스트 안 붙이고 시간만 흡수
        if not P['text'].strip().endswith(xt):
            P['text'] = P['text'].strip() + ' ' + xt
        P['end'] = s['start_us'] + s['duration_us']
        P['changed'] = True
        P['remove'].append(s['id'])
    else:
        result.append({'id': s['id'], 'text': s['text'], 'start': s['start_us'],
                       'end': s['start_us'] + s['duration_us'], 'changed': False, 'remove': []})

settext = []
timing = {}
remove = []
for r in result:
    if r['changed']:
        settext.append({'cmd': 'set-text', 'id': r['id'], 'text': r['text']})
        timing[r['id']] = {'start': r['start'], 'duration': r['end'] - r['start']}
        remove.extend(r['remove'])

with open('/tmp/merge_settext.jsonl', 'w') as f:
    for o in settext:
        f.write(json.dumps(o, ensure_ascii=False) + '\n')
json.dump({'timing': timing, 'remove': remove}, open('/tmp/merge_struct.json', 'w'), ensure_ascii=False)
print(f"흡수 그룹(set-text): {len(settext)}, 제거: {len(remove)}")
print("=== 흡수 결과 샘플 ===")
for r in result:
    if r['changed']:
        print(f"  {(r['end']-r['start'])/1e6:.1f}s [{r['text']}]")
