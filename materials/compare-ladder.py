#!/usr/bin/env python3
"""Compare the Python reference and the node run of assets/gtl-live.js BY VALUE over the whole
ladder, then prove the comparison can fail: a planted fault on one number must be caught.

Usage: python3 materials/compare-ladder.py      (exit 0 = agree and the planted fault was caught)
"""
import copy
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REL = 1e-9


def flatten(x, path=""):
    if isinstance(x, dict):
        for k in sorted(x):
            yield from flatten(x[k], path + "/" + k)
    elif isinstance(x, list):
        for i, v in enumerate(x):
            yield from flatten(v, path + "/" + str(i))
    else:
        yield path, x


def compare(a, b):
    fa, fb = dict(flatten(a)), dict(flatten(b))
    bad = []
    for k in sorted(set(fa) | set(fb)):
        if k not in fa or k not in fb:
            bad.append(f"{k}: missing on one side")
            continue
        x, y = fa[k], fb[k]
        if isinstance(x, bool) or isinstance(y, bool) or isinstance(x, str) or x is None or y is None:
            if x != y:
                bad.append(f"{k}: {x!r} vs {y!r}")
        elif abs(x - y) > REL * max(1.0, abs(x), abs(y)):
            bad.append(f"{k}: {x!r} vs {y!r}")
    return bad, len(fa)


def main():
    py = json.loads(subprocess.check_output([sys.executable, os.path.join(HERE, "gtl_reference.py")]))
    nd = json.loads(subprocess.check_output(["node", os.path.join(HERE, "run_ladder_node.js")]))
    st = nd.pop("selfTest")
    # the node side drops the ctx object inside build results only via runOne; both sides emit the same keys
    bad, n = compare(py, nd)
    print(f"values compared: {n}")
    print("python vs node:", "AGREE" if not bad else "DIFFER")
    for line in bad[:30]:
        print("  ", line)
    planted = copy.deepcopy(nd)
    planted["rungs"]["r2"]["wall"] += 1
    caught = bool(compare(py, planted)[0])
    print("planted +1 second fault on rungs/r2/wall:", "caught" if caught else "NOT CAUGHT")
    print("engine selfTest:", json.dumps(st))
    sys.exit(0 if (not bad and caught and st["pass"]) else 1)


if __name__ == "__main__":
    main()
