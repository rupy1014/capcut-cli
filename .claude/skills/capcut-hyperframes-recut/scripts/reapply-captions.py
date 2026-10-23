#!/usr/bin/env python3
"""가편집이 끝난 draft 에 자막을 다시 입힌다.

자막 원본 draft 의 cue 는 합성 클립(=가편집 소스) 타임라인 기준이다.
가편집한 draft 의 비디오 세그먼트가 source(=edit-source) ↔ target 매핑을 주므로
그걸로 각 cue 를 새 시각에 다시 놓는다. 컷 안에 통째로 들어간 cue 는 버린다.

자막 재료는 **기존 자동자막 세그먼트를 통째로 복제**한다 (`capcut add-text` 금지 —
평범한 `type:"text"` 가 되어 앱에서 다르게 렌더된다).

`--mirror-tracks` 를 주면 오버레이 비디오 트랙(자료화면·얼굴)도 메인 트랙과 **완전히 같은
조각**으로 다시 만든다. 사용자는 메인 트랙에서만 자르면 된다. 조각마다 같은 source 시각을 덮던
원래 오버레이 세그먼트의 배치(scale·transform·alpha)와 마스크를 물려받는다 — 장면별 배치 유지.

  python3 reapply-captions.py --from <자막draft> --to <가편집draft> [--apply]
"""
import argparse, json, os, sys, copy, uuid

ap = argparse.ArgumentParser(description="가편집이 끝난 draft 에 자막을 다시 입힌다")
ap.add_argument("--from", dest="src", required=True, help="자막 원본 draft (합성 클립과 같은 타임라인)")
ap.add_argument("--to", dest="dst", required=True, help="손으로 가편집한 draft")
ap.add_argument("--min", type=float, default=0.25, help="이보다 짧게 남는 cue 는 버린다")
ap.add_argument("--mirror-tracks", action="store_true",
                help="메인 트랙에서 한 컷을 오버레이 비디오 트랙에도 그대로 먹인다")
ap.add_argument("--apply", action="store_true")
A = ap.parse_args()
SRC, DST, FPS = A.src, A.dst, 30
MIN  = None   # A.min
MIN = A.min
uid  = lambda: str(uuid.uuid4()).upper()
f2us = lambda f: round(f * 1000000 / FPS)

src = json.load(open(os.path.join(SRC, "draft_info.json")))
st  = next(t for t in src["tracks"] if t["type"] == "text")
smat = {m["id"]: m for m in src["materials"]["texts"]}
sani = {m["id"]: m for m in src["materials"].get("material_animations", [])}
cues = []
for s in sorted(st["segments"], key=lambda s: s["target_timerange"]["start"]):
    cues.append(dict(seg=s, mat=smat[s["material_id"]],
                     s=s["target_timerange"]["start"] / 1e6,
                     e=(s["target_timerange"]["start"] + s["target_timerange"]["duration"]) / 1e6))

dst = json.load(open(os.path.join(DST, "draft_info.json")))
vt  = next(t for t in dst["tracks"] if t["type"] == "video" and t.get("flag") == 0)
segs = sorted(vt["segments"], key=lambda s: s["target_timerange"]["start"])
keeps = [(s["source_timerange"]["start"] / 1e6,
          (s["source_timerange"]["start"] + s["source_timerange"]["duration"]) / 1e6,
          s["target_timerange"]["start"] / 1e6) for s in segs]
print("가편집 결과: 세그먼트 %d · %.2fs → %.2fs" %
      (len(segs), sum(b - a for a, b, _ in keeps), dst["duration"] / 1e6))

def place(a, b):
    """[a,b] (edit-source 시각) → (새 시작, 총 길이). 컷에 다 먹혔으면 None."""
    first, tot = None, 0.0
    for ka, kb, kt in keeps:
        o = min(b, kb) - max(a, ka)
        if o > 0:
            if first is None: first = kt + (max(a, ka) - ka)
            tot += o
    return (first, tot) if first is not None else None

out, dropped = [], []
for c in cues:
    r = place(c["s"], c["e"])
    if not r or r[1] < MIN: dropped.append(c); continue
    out.append((r[0], r[1], c))
out.sort(key=lambda x: x[0])
for i in range(len(out) - 1):
    ov = (out[i][0] + out[i][1]) - out[i + 1][0]
    if ov > 0: out[i] = (out[i][0], out[i][1] - ov, out[i][2])
out = [o for o in out if o[1] >= MIN]

print("자막 %d → %d (컷에 사라짐 %d)" % (len(cues), len(out), len(dropped)))

# 컷 경계에 걸린 cue — 말은 반만 남았는데 자막은 전문이 뜬다. 손으로 고쳐야 한다.
part = []
for ns, nd, c in out:
    orig = c["e"] - c["s"]
    if nd < orig - 0.03:
        live = []
        for ka, kb, _kt in keeps:
            lo, hi = max(c["s"], ka), min(c["e"], kb)
            if hi - lo > 0.001: live.append(((lo-c["s"])/orig, (hi-c["s"])/orig))
        part.append((ns, nd/orig, " ".join("%.0f~%.0f%%" % (x*100, y*100) for x, y in live),
                     json.loads(c["mat"]["content"])["text"]))
if part:
    print("\n⚠ 컷 경계에 걸린 cue %d개 — 남은 말에 맞춰 텍스트를 고쳐라" % len(part))
    print("   (원본 draft 백업의 `words` 로 어느 어절이 살아남았는지 역추적한다)")
    for ns, r, where, txt in sorted(part, key=lambda x: x[1]):
        if r > 0.93: continue
        print("   %7.2f  남은 %3.0f%%  %-22s %s" % (ns, r*100, where, txt.replace("\n", " / ")))
for c in dropped[:12]:
    print("   ✕ %7.2f  %s" % (c["s"], json.loads(c["mat"]["content"])["text"].replace("\n", " ")[:40]))
if len(dropped) > 12: print("   … 외 %d개" % (len(dropped) - 12))

if not A.apply:
    print("\n(미리보기 — 적용은 --apply)"); sys.exit(0)
if os.popen("pgrep -x CapCut").read().strip(): sys.exit("ABORT: CapCut 실행 중")

# 오버레이 비디오 트랙을 메인 트랙 컷에 맞춰 다시 만든다
# 조각마다 **같은 source 시각을 덮던 원래 오버레이 세그먼트**를 틀로 쓴다 — 첫 세그먼트 하나를 복제하면
# 장면별 배치(슬라이드 폭 채움 ↔ 코딩 전체 화면, 캠 alpha)가 통째로 사라진다(1021).
# extra_material_refs(얼굴 원형 마스크 등)는 조각마다 새 id 로 복제한다.
if A.mirror_tracks:
    others = [t for t in dst["tracks"] if t["type"] == "video" and t is not vt]
    kind_of = {m["id"]: k for k, v in dst["materials"].items() if isinstance(v, list)
               for m in v if isinstance(m, dict) and "id" in m}
    by_id = {m["id"]: m for v in dst["materials"].values() if isinstance(v, list)
             for m in v if isinstance(m, dict) and "id" in m}
    for t in others:
        osegs = sorted(t["segments"], key=lambda s: s["target_timerange"]["start"])
        base = osegs[0]
        b0 = base["source_timerange"]["start"] - segs[0]["source_timerange"]["start"]   # µs, 트랙 간 싱크 오프셋
        def template(src_us):
            for s in osegs:
                a = s["source_timerange"]["start"]
                if a <= src_us < a + s["source_timerange"]["duration"]: return s
            return min(osegs, key=lambda s: abs(s["source_timerange"]["start"] - src_us))
        new, layouts = [], set()
        for ms in segs:                      # 메인 트랙과 완전히 같은 조각으로
            o_src = ms["source_timerange"]["start"] + b0
            tpl = template(o_src)
            ns = copy.deepcopy(tpl); ns["id"] = uid()
            ns["source_timerange"] = {"start": o_src, "duration": ms["source_timerange"]["duration"]}
            ns["target_timerange"] = dict(ms["target_timerange"])
            refs = []
            for r in tpl.get("extra_material_refs", []):
                if r not in by_id: continue
                c = copy.deepcopy(by_id[r]); c["id"] = uid(); dst["materials"][kind_of[r]].append(c); refs.append(c["id"])
            ns["extra_material_refs"] = refs
            layouts.add(json.dumps([ns["clip"].get("scale"), ns["clip"].get("transform"), ns["clip"].get("alpha")]))
            new.append(ns)
        t["segments"] = new
        print("   배치 %d종 유지" % len(layouts))
        print("오버레이 트랙 미러: %s → 세그먼트 %d" % (
            os.path.basename(next(m["path"] for m in dst["materials"]["videos"]
                                  if m["id"] == base["material_id"])), len(new)))

# 이전에 넣은 자막 트랙이 있으면 걷어낸다 (재실행 가능하게)
dst["tracks"] = [t for t in dst["tracks"] if t["type"] != "text"]
dst["materials"]["texts"] = []
dst["materials"]["material_animations"] = []

segs_new = []
for ns, nd, c in out:
    m = copy.deepcopy(c["mat"]); m["id"] = uid()
    dst["materials"]["texts"].append(m)
    s = copy.deepcopy(c["seg"]); s["id"] = uid(); s["material_id"] = m["id"]
    s["target_timerange"] = {"start": round(ns * 1e6), "duration": round(nd * 1e6)}
    refs = []
    for r in s.get("extra_material_refs", []):
        a = sani.get(r)
        if a: a = copy.deepcopy(a); a["id"] = uid(); dst["materials"]["material_animations"].append(a); refs.append(a["id"])
    s["extra_material_refs"] = refs
    segs_new.append(s)
dst["tracks"].append({"id": uid(), "type": "text", "flag": 1, "attribute": 0,
                      "name": "", "is_default_name": True, "segments": segs_new})

blob = json.dumps(dst, ensure_ascii=False, separators=(",", ":"))
tl = next(p for p in os.listdir(os.path.join(DST, "Timelines"))
          if os.path.isdir(os.path.join(DST, "Timelines", p)))
for p in [os.path.join(DST, f) for f in ("draft_info.json", "draft_info.json.bak", "template-2.tmp")] + \
         [os.path.join(DST, "Timelines", tl, f) for f in ("draft_info.json", "draft_info.json.bak", "template-2.tmp")]:
    open(p, "w", encoding="utf-8").write(blob)
print("자막 %d개 기록 · 미러 6개" % len(segs_new))
