import json

CONN = ('그리고', '그래서', '근데', '그러면', '그러니까', '하지만', '그치만', '그러나',
        '예를', '왜냐면', '아니면', '그래도', '또')
def starts_conn(w):
    return w == '자' or w == '또' or w.startswith(CONN)

TERM = ('거든', '구나', '같아', '거야', '거다', '된다', '한다', '있어', '없어', '봐', '대',
        '래', '네', '다', '요', '야', '죠', '해')                # 종결 (보조어간 ~지 제외)
DEP = ('않', '수', '것', '거', '게', '때', '데', '줄', '리', '뿐', '채', '척', '듯',
       '있', '없', '거고', '거든', '거야', '건데', '건', '걸')   # 앞에서 끊으면 안 되는 의존명사/보조
CONN_END = ('는데', '은데', '지만', '거나', '든지', '니까', '면서', '려면', '도록',
            '아서', '어서', '고', '서', '며', '게', '면')          # 연결
def is_term(w): return w.endswith(TERM)
def is_conn_end(w): return w.endswith(CONN_END)

BAD_TAIL = ('는', '은', '을', '를', '이', '가', '의', '와', '과', '도', '만', '로', '으로',
            '에', '한', '인', '던', '적', '그', '저', '안', '잘', '못', '더', '좀', '이런',
            '저런', '그런', '어떤', '라고', '라는', '이라고')
def best_split(words):
    total = len(' '.join(words))
    best = None; bs = -10
    for i in range(1, len(words)):
        prev, nxt = words[i-1], words[i]
        ll = len(' '.join(words[:i])); rl = total - ll - 1
        score = 0.0
        # 의미 경계
        if starts_conn(nxt):        score += 2.0      # 다음이 접속사
        elif is_term(prev):         score += 1.5      # 앞이 종결어미
        elif is_conn_end(prev):     score += 0.8      # 앞이 연결어미
        else:                       score -= 0.6      # 명확한 경계 아님
        # 끊기 나쁜 지점: 조사·관형형·부사·인용 뒤 (뒷말 수식/연결)
        if prev.endswith(BAD_TAIL): score -= 1.2
        # 영어 구 분리 방지 (Claude Code 등)
        if prev[-1:].isascii() and nxt[:1].isascii(): score -= 2.0
        # 의존명사·보조용언 앞에서 끊기 방지 (~지 않고, ~을 때, ~할 수 등)
        if nxt.startswith(DEP): score -= 2.0
        # 1글자 어절(반/그/더/안…) 뒤에서 끊기 방지 (반 / 자동화)
        if len(prev) <= 1: score -= 1.0
        # 한쪽이 너무 짧음(단독 어절/짧은 줄) 방지
        if ll < 6: score -= 1.5
        if rl < 6: score -= 1.5
        if i == len(words) - 1 and rl <= 5: score -= 2.0   # 마지막 한 어절 떨어짐
        # 균형은 약하게
        score += (1 - abs(ll - rl) / total) * 0.3
        if score > bs:
            bs = score; best = i
    return best

def wrap(text, limit=20):
    text = text.replace('\n', ' ').strip()
    if len(text) <= limit:
        return text
    words = text.split()
    if len(words) < 2:
        return text
    i = best_split(words)
    l1 = ' '.join(words[:i]); l2 = ' '.join(words[i:])
    # 한 줄이 여전히 너무 길면(>30) 그 줄만 한 번 더 분할 → 최대 3줄
    def maybe(s):
        if len(s) > 30 and len(s.split()) > 1:
            j = best_split(s.split())
            ws = s.split()
            return ' '.join(ws[:j]) + '\n' + ' '.join(ws[j:])
        return s
    return maybe(l1) + '\n' + maybe(l2)

t = json.load(open('/tmp/0531_v10.json'))
def emp(x): return x == '' or x.startswith('{')
out = []
for s in t:
    if emp(s['text']):
        continue
    orig = s['text']
    new = wrap(orig)
    if new != orig:
        out.append({'cmd': 'set-text', 'id': s['id'], 'text': new})

open('/tmp/wrap2.jsonl', 'w').write('\n'.join(json.dumps(o, ensure_ascii=False) for o in out))
print(f"줄바꿈 대상: {len(out)}")
print("=== 미리보기 (처음 30개) ===")
for o in out[:30]:
    print('  ' + o['text'].replace('\n', ' / '))
