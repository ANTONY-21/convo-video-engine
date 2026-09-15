#!/usr/bin/env python3
"""Number-lock pass for inflation_convo. Verifies every derived number in storyboard.md.
Math is the truth: if a derived number disagrees, fix the storyboard, not the math."""
import math

CPI = 4.45          # July 2026, Trading Economics
FOOD = 5.52         # July 2026 provisional, MoSPI
SAVINGS = 3.00      # typical savings acct rate used in dialogue
CHAI_2020 = 10.0
YEARS = 6           # 2020 -> 2026

checks = []

# 1. Chai price growth under food inflation
chai_now = CHAI_2020 * (1 + FOOD/100) ** YEARS
pct = (chai_now / CHAI_2020 - 1) * 100
checks.append(("chai 2026 price", round(chai_now, 2), "≈ ₹14 (displayed)"))
checks.append(("chai pct rise", round(pct, 1), "≈ +40% (displayed)"))

# 2. Rule of 72
rule72 = 72 / CPI
checks.append(("rule of 72 doubling years", round(rule72, 1), "≈ 16 years (displayed)"))
exact = math.log(2) / math.log(1 + CPI/100)
checks.append(("exact doubling years", round(exact, 1), "rule72 sanity"))

# 3. Real rate
real = SAVINGS - CPI
checks.append(("real rate", round(real, 2), "−1.45%/yr (displayed)"))

# 4. Nifty drop (yfinance 2026-09-08: high 24774.0, now 23653.0)
nifty_high, nifty_now = 24774.0, 23653.0
drop = (nifty_now / nifty_high - 1) * 100
checks.append(("nifty drop pct", round(drop, 1), "−4.5% (displayed)"))

fails = 0
for name, val, expect in checks:
    ok = True
    if name == "chai 2026 price": ok = 13.5 <= val <= 14.2
    if name == "chai pct rise": ok = 35 <= val <= 42
    if name == "rule of 72 doubling years": ok = 15.5 <= val <= 17.0
    if name == "real rate": ok = val == -1.45
    if name == "nifty drop pct": ok = -4.8 <= val <= -4.2
    status = "PASS" if ok else "FAIL"
    if not ok: fails += 1
    print(f"{status}  {name}: {val}  (expect {expect})")

print("\nALL PASS" if fails == 0 else f"\n{fails} FAILURES — fix storyboard")
