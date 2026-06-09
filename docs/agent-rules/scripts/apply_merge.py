import json, sys

draft = sys.argv[1]
struct = json.load(open('/tmp/merge_struct.json'))
timing = struct['timing']           # rep_id -> {start, duration}
remove = set(struct['remove'])      # 제거할 세그먼트 ids

d = json.load(open(draft))
removed = 0; retimed = 0
for t in d['tracks']:
    if t.get('type') != 'text':
        continue
    new_segs = []
    for s in t['segments']:
        sid = s['id']
        if sid in remove:
            removed += 1
            continue
        if sid in timing:
            s['target_timerange']['start'] = timing[sid]['start']
            s['target_timerange']['duration'] = timing[sid]['duration']
            retimed += 1
        new_segs.append(s)
    t['segments'] = new_segs

json.dump(d, open(draft, 'w'), ensure_ascii=False)
print(f"제거: {removed}, 시간조정: {retimed}")
