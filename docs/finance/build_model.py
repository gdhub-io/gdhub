"""Builds financial-model.xlsx. Every number lives on the Assumptions sheet; the rest is formulas.

Run: python3 docs/finance/build_model.py  (then recalculate in Excel/LibreOffice on open)
"""

from datetime import date
from pathlib import Path

from openpyxl import Workbook
from openpyxl.chart import BarChart, LineChart, Reference
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

OUT = Path(__file__).with_name("financial-model.xlsx")
MONTHS = 36
START = date(2026, 11, 1)

FONT = "Arial"
BLUE = Font(name=FONT, color="0000FF")
BLACK = Font(name=FONT)
GREEN = Font(name=FONT, color="008000")
BOLD = Font(name=FONT, bold=True)
TITLE = Font(name=FONT, bold=True, size=14)
HEAD = Font(name=FONT, bold=True, color="FFFFFF")
HEAD_FILL = PatternFill("solid", fgColor="1F3864")
SECTION_FILL = PatternFill("solid", fgColor="D9E1F2")
YELLOW = PatternFill("solid", fgColor="FFFF00")
THIN = Border(top=Side(style="thin"))

USD = '$#,##0;($#,##0);"-"'
USD2 = '$#,##0.00;($#,##0.00);"-"'
USD4 = '$#,##0.0000;($#,##0.0000);"-"'
PCT = '0.0%;(0.0%);"-"'
NUM = '#,##0;(#,##0);"-"'
NUM1 = '#,##0.0;(#,##0.0);"-"'

wb = Workbook()

# ---------------------------------------------------------------- Assumptions

A = wb.active
A.title = "Assumptions"
A["A1"] = "GDHub — assumptions"
A["A1"].font = TITLE
A["A2"] = "Scenario (1 = Low, 2 = Base, 3 = High)"
A["A2"].font = BOLD
A["B2"] = 2
A["B2"].font = BLUE
A["B2"].fill = YELLOW
A["C2"] = '=INDEX({"Low","Base","High"},$B$2)'
A["C2"].font = BOLD

for col, text in zip("ABCDEFG", ["Assumption", "Low", "Base", "High", "Live", "Unit", "Source / note"]):
	c = A[f"{col}4"]
	c.value = text
	c.font = HEAD
	c.fill = HEAD_FILL

# key, label, low, base, high, unit, format, note, needs_owner_input
ROWS = [
	("Pricing", None),
	("ai_price", "Checkpoint · AI price", 19, 19, 19, "$ / checkpoint", USD2, "src/config/checkpoint.ts CHECKPOINT_AI_PRICE", False),
	("pro_gmv", "Checkpoint · Pro average price paid", 340, 400, 450, "$ / checkpoint", USD, "Blend of CURATOR_PRICE rows ($300–660); solo Experienced is $300", False),
	("take_rate", "Platform share of Pro price", 0.2, 0.2, 0.2, "% of price", PCT, "Price = curator rate + 25% (checkpoint-standard §8) → 25/125 = 20% of what the author pays", False),
	("vac_price", "Paid vacancy listing", 10.5, 10.5, 10.5, "$ / listing", USD2, "€9 Paddle price (docs/paid-vacancies.md) at ~1.17 USD/EUR", False),
	("Payment & delivery costs", None),
	("stripe_pct", "Stripe fee, %", 0.044, 0.044, 0.044, "% of charge", PCT, "2.9% card + 1.5% international (most buyers are outside the US); stripe.com/pricing", False),
	("stripe_fixed", "Stripe fee, fixed", 0.3, 0.3, 0.3, "$ / charge", USD2, "stripe.com/pricing", False),
	("paddle_pct", "Paddle fee, %", 0.05, 0.05, 0.05, "% of charge", PCT, "Paddle MoR 5% + $0.50; paddle.com/pricing", False),
	("paddle_fixed", "Paddle fee, fixed", 0.5, 0.5, 0.5, "$ / charge", USD2, "paddle.com/pricing", False),
	("payout_pct", "Curator payout fee, %", 0.0025, 0.0025, 0.0025, "% of payout", PCT, "Stripe Connect Express 0.25% + $0.25 per payout. Payouts are NOT built yet", False),
	("payout_fixed", "Curator payout fee, fixed", 0.25, 0.25, 0.25, "$ / payout", USD2, "Stripe Connect; one payout per Pro checkpoint", False),
	("connect_monthly", "Connect account fee", 2, 2, 2, "$ / active curator / month", USD2, "Stripe Connect Express", False),
	("pro_per_curator", "Pro checkpoints a curator runs at once", 2, 2.5, 3, "checkpoints", NUM1, "~2 for a curator with a day job, ~4 for a freelancer or laid-off senior — market-sizing.md §6", False),
	("refund_rate", "Refunded checkpoints", 0.05, 0.03, 0.02, "% of checkpoints", PCT, "Curator did not answer in CURATOR_ANSWER_DAYS → money back. Guess", False),
	("daily_rate", "Daily.co video", 0.004, 0.004, 0.004, "$ / participant-minute", USD4, "daily.co/pricing; 10k free minutes/month ignored (conservative)", False),
	("calls", "Calls per Pro checkpoint", 5, 5, 5, "calls", NUM, "SESSIONS_PER_CHECKPOINT", False),
	("call_minutes", "Minutes per call", 60, 45, 45, "minutes", NUM, "SESSION_MINUTES (a guide; calls can run longer)", False),
	("call_people", "People on a call", 4, 3, 3, "participants", NUM1, "Curator + author + avg team on call (max 5 of team)", False),
	("ai_cost", "AI model cost per checkpoint", 0.07, 0.011, 0.011, "$ / checkpoint", USD4, "docs/ai-costs.md — Luna + Terra report; Low = Sol throughout", False),
	("Launch sequence", None),
	("pro_launch", "Checkpoint · Pro (user ↔ expert) starts", 1, 1, 1, "model month", NUM, "Step 1 — founder's order of launch", True),
	("ai_launch", "Checkpoint · AI curator starts", 7, 5, 4, "model month", NUM, "Step 2", True),
	("con_launch", "Paid 1:1 consultations start", 13, 10, 8, "model month", NUM, "Step 3 — Preply-style marketplace", True),
	("Demand — Checkpoint · AI", None),
	("ai_new_m1", "New AI checkpoints, launch month", 5, 10, 20, "checkpoints", NUM, "Guess. Replace with the first Season's real number", True),
	("ai_g_y1", "Growth of new AI checkpoints, year 1", 0.08, 0.15, 0.22, "% month over month", PCT, "Guess", True),
	("ai_g_y2", "Growth, year 2", 0.04, 0.08, 0.12, "% month over month", PCT, "Guess", True),
	("ai_g_y3", "Growth, year 3", 0.02, 0.04, 0.06, "% month over month", PCT, "Guess", True),
	("ai_repeat", "AI → another AI checkpoint", 0.15, 0.25, 0.35, "% of last month's", PCT, "'Save point' repeat. Guess", True),
	("ai_to_pro", "AI → Pro next month", 0.03, 0.05, 0.08, "% of last month's", PCT, "Upgrade funnel; 0 until Pro and AI both run. Guess", True),
	("Demand — Checkpoint · Pro", None),
	("pro_new_m1", "New Pro checkpoints, launch month", 1, 3, 6, "checkpoints", NUM, "Guess. Research kill rule: under 8 paid seats → stop", True),
	("pro_g_y1", "Growth of new Pro checkpoints, year 1", 0.06, 0.12, 0.18, "% month over month", PCT, "Guess; capped by curator supply", True),
	("pro_g_y2", "Growth, year 2", 0.03, 0.06, 0.1, "% month over month", PCT, "Guess", True),
	("pro_g_y3", "Growth, year 3", 0.01, 0.03, 0.05, "% month over month", PCT, "Guess", True),
	("pro_repeat", "Pro → another Pro checkpoint", 0.25, 0.35, 0.45, "% of last month's", PCT, "Guess", True),
	("Curator supply", None),
	("cur_m1", "Curators ready in month 1", 2, 3, 5, "curators", NUM, "Founder network and signed expert LOIs. FILL IN", True),
	("cur_add", "Curators recruited a month", 1, 2, 4, "curators / month", NUM, "Willing pool ~2,500–4,500 in wave-1 countries; recruiting, not headcount, is the limit. Guess", True),
	("cur_churn", "Curators leaving a month", 0.08, 0.05, 0.03, "% of curators", PCT, "Laid-off seniors leave when rehired. Guess", True),
	("Demand — paid 1:1 consultations", None),
	("con_m1", "Paid sessions, launch month", 10, 30, 60, "sessions", NUM, "Guess", True),
	("con_g_y1", "Growth of sessions, year 1", 0.08, 0.15, 0.25, "% month over month", PCT, "Guess", True),
	("con_g_y2", "Growth, year 2", 0.04, 0.08, 0.12, "% month over month", PCT, "Guess", True),
	("con_g_y3", "Growth, year 3", 0.02, 0.04, 0.06, "% month over month", PCT, "Guess", True),
	("con_price", "Average session price", 40, 60, 90, "$ / session (1 hour)", USD, "Expert sets the rate. MentorCruise game-dev $60–200/h, Codementor ~$32–120/h, Upwork Unity median $20–40/h — market-sizing.md §5", True),
	("con_take", "Platform commission on a session", 0.15, 0.2, 0.25, "% of price", PCT, "Preply: 100% of a trial lesson, then 33% → 18% at 400+ h; MentorCruise ≈20%. Flat rate is easier to defend to experts", True),
	("con_minutes", "Minutes per session", 60, 60, 60, "minutes", NUM, "2 participants on Daily.co", False),
	("con_per_expert", "Sessions an expert gives a month", 6, 8, 10, "sessions", NUM, "Drives Connect accounts and payouts", False),
	("Demand — vacancies", None),
	("vac_m1", "Paid vacancies, month 1", 2, 5, 10, "listings", NUM, "Fill from Payment table history", True),
	("vac_g", "Growth of paid vacancies", 0.0, 0.03, 0.06, "% month over month", PCT, "Guess — research says do not push the job board", True),
	("Operating costs (monthly)", None),
	("infra_y1", "Infrastructure & SaaS, year 1", 300, 300, 300, "$ / month", USD, "Same in every scenario — scenarios differ in how well we sell, not in what we pay. Vercel, Postgres, Redis, Typesense, Sanity, Novu, Brevo, Matrix, Tolgee, Daily base, domains. FILL FROM INVOICES", True),
	("infra_y2", "Infrastructure & SaaS, year 2", 500, 500, 500, "$ / month", USD, "Same in every scenario — scenarios differ in how well we sell, not in what we pay. Scales with users", True),
	("infra_y3", "Infrastructure & SaaS, year 3", 800, 800, 800, "$ / month", USD, "Same in every scenario — scenarios differ in how well we sell, not in what we pay.", True),
	("payroll_y1", "Team payroll, year 1", 0, 0, 0, "$ / month", USD, "Same in every scenario — scenarios differ in how well we sell, not in what we pay. Founders unpaid by default. FILL IN", True),
	("payroll_y2", "Team payroll, year 2", 8000, 8000, 8000, "$ / month", USD, "Same in every scenario — scenarios differ in how well we sell, not in what we pay. e.g. one developer + community manager after funding", True),
	("payroll_y3", "Team payroll, year 3", 15000, 15000, 15000, "$ / month", USD, "Same in every scenario — scenarios differ in how well we sell, not in what we pay.", True),
	("admin", "Legal, accounting, banking", 150, 150, 150, "$ / month", USD, "Same in every scenario — scenarios differ in how well we sell, not in what we pay. FILL IN", True),
	("Marketing", None),
	("mkt_fixed", "Community, fixed", 0, 0, 0, "$ / month", USD, "Same in every scenario — scenarios differ in how well we sell, not in what we pay. Jam prizes, sponsorships, content not tied to a sale. 0 = organic only. FILL IN", True),
	("cac_pro", "Cost to acquire a Pro buyer (CAC)", 120, 80, 50, "$ / new buyer", USD, "Ads, creators, partner fees per new Pro buyer. Higher in Low: worse selling, not more spending. Guess", True),
	("cac_ai", "Cost to acquire an AI buyer (CAC)", 10, 6, 4, "$ / new buyer", USD, "Guess", True),
	("cac_con", "Cost to acquire a 1:1 session", 0, 0, 0, "$ / session", USD, "0 — sold to people already on the platform", True),
	("Cash", None),
	("start_cash", "Cash at start", 10000, 10000, 10000, "$", USD, "FILL IN — cash available on " + START.isoformat(), True),
	("funding", "Funding raised", 0, 150000, 300000, "$", USD, "Pre-seed target. FILL IN", True),
	("funding_month", "Month the funding lands", 13, 10, 8, "model month", NUM, "1 = " + START.strftime("%b %Y"), True),
]

R = {}
row = 5
for item in ROWS:
	if item[1] is None:
		A.cell(row, 1, item[0]).font = BOLD
		for col in range(1, 8):
			A.cell(row, col).fill = SECTION_FILL
		row += 1
		continue
	key, label, low, base, high, unit, fmt, note, owner = item
	R[key] = row
	A.cell(row, 1, label).font = BLACK
	for col, v in zip((2, 3, 4), (low, base, high)):
		c = A.cell(row, col, v)
		c.font = BLUE
		c.number_format = fmt
		if owner:
			c.fill = YELLOW
	live = A.cell(row, 5, f"=INDEX(B{row}:D{row},$B$2)")
	live.font = BOLD
	live.number_format = fmt
	A.cell(row, 6, unit).font = BLACK
	A.cell(row, 7, note).font = BLACK
	row += 1

A.column_dimensions["A"].width = 42
for col in "BCDE":
	A.column_dimensions[col].width = 12
A.column_dimensions["F"].width = 26
A.column_dimensions["G"].width = 90
A.freeze_panes = "B5"


def a(key):
	return f"Assumptions!$E${R[key]}"


# ---------------------------------------------------------------- Unit economics

U = wb.create_sheet("Unit Economics")
U["A1"] = "One checkpoint, live scenario"
U["A1"].font = TITLE
for col, text in zip("ABCD", ["Line ($)", "Checkpoint · AI", "Checkpoint · Pro", "Note"]):
	c = U[f"{col}3"]
	c.value = text
	c.font = HEAD
	c.fill = HEAD_FILL

UE = [
	("Author pays", f"={a('ai_price')}", f"={a('pro_gmv')}", "GMV"),
	("Curator's part", "=0", f"=-C4*(1-{a('take_rate')})", "Passed through to the curator"),
	("Platform revenue", "=B4+B5", "=C4+C5", "Net revenue"),
	("Card fee (on the full charge)", f"=-(B4*{a('stripe_pct')}+{a('stripe_fixed')})", f"=-(C4*{a('stripe_pct')}+{a('stripe_fixed')})", "Platform carries the whole Stripe fee"),
	("Payout to curator fee", "=0", f"=-(-C5*{a('payout_pct')}+{a('payout_fixed')})", "Stripe Connect"),
	("Connect account, share", "=0", f"=-{a('connect_monthly')}/{a('pro_per_curator')}", "Monthly account fee spread over concurrent checkpoints"),
	("Video calls", "=0", f"=-{a('calls')}*{a('call_minutes')}*{a('call_people')}*{a('daily_rate')}", "Daily.co participant-minutes"),
	("AI model", f"=-{a('ai_cost')}", f"=-{a('ai_cost')}", "docs/ai-costs.md"),
	("Contribution per checkpoint", "=SUM(B6:B11)", "=SUM(C6:C11)", "Before refunds and fixed costs"),
	("Contribution margin, of platform revenue", '=IF(B6=0,"",B12/B6)', '=IF(C6=0,"",C12/C6)', ""),
	("Contribution margin, of what the author pays", '=IF(B4=0,"",B12/B4)', '=IF(C4=0,"",C12/C4)', ""),
]
for i, (label, ai, pro, note) in enumerate(UE, start=4):
	U.cell(i, 1, label).font = BOLD if label.startswith(("Platform", "Contribution per")) else BLACK
	for col, f in ((2, ai), (3, pro)):
		c = U.cell(i, col, f)
		c.font = BLACK
		c.number_format = PCT if "margin" in label else USD2
	U.cell(i, 4, note).font = BLACK
	if label.startswith(("Platform", "Contribution per")):
		for col in range(1, 4):
			U.cell(i, col).border = THIN

U["A16"] = "One buyer, over their checkpoints"
U["A16"].font = BOLD
BUYER = [
	("Cost to acquire them (CAC)", f"={a('cac_ai')}", f"={a('cac_pro')}", USD2, "Assumptions → Marketing"),
	("Checkpoints they buy, repeats included", f"=1/(1-{a('ai_repeat')})", f"=1/(1-{a('pro_repeat')})", NUM1, "1 / (1 − repeat rate); AI→Pro upgrades not counted"),
	("Lifetime contribution", "=B12*B18", "=C12*C18", USD2, ""),
	("Lifetime contribution after CAC", "=B19-B17", "=C19-C17", USD2, "Negative = every buyer loses money"),
	("Checkpoints to pay back CAC", '=IF(B12<=0,"never",B17/B12)', '=IF(C12<=0,"never",C17/C12)', NUM1, ""),
]
for i, (label, ai, pro, fmt, note) in enumerate(BUYER, start=17):
	U.cell(i, 1, label).font = BOLD if "after CAC" in label else BLACK
	for col, f in ((2, ai), (3, pro)):
		c = U.cell(i, col, f)
		c.number_format = fmt
		c.font = BOLD if "after CAC" in label else BLACK
	U.cell(i, 4, note).font = BLACK

U["A23"] = "Break-even on fixed costs, year 1"
U["A23"].font = BOLD
U["A24"] = "Fixed costs per month (infra + payroll + community + admin)"
U["B24"] = f"={a('infra_y1')}+{a('payroll_y1')}+{a('mkt_fixed')}+{a('admin')}"
U["B24"].number_format = USD
U["A25"] = "…checkpoints a month to cover them, AI alone"
U["B25"] = '=IF(B12<=0,"never",B24/B12)'
U["A26"] = "…checkpoints a month to cover them, Pro alone"
U["B26"] = '=IF(C12<=0,"never",B24/C12)'
U["D25"] = "Before CAC: the contribution of checkpoints already sold"
for c in ("B25", "B26"):
	U[c].number_format = NUM
	U[c].font = BOLD
for r in (24, 25, 26):
	U.cell(r, 1).font = BLACK
U.column_dimensions["A"].width = 64
U.column_dimensions["B"].width = 18
U.column_dimensions["C"].width = 18
U.column_dimensions["D"].width = 56

# ---------------------------------------------------------------- Monthly

M = wb.create_sheet("Monthly")
M["A1"] = "Monthly projection, live scenario"
M["A1"].font = TITLE
M["A2"] = '="Scenario: "&Assumptions!$C$2'
M["A2"].font = BOLD

FIRST = 3  # column C is month 1
cols = [get_column_letter(FIRST + i) for i in range(MONTHS)]

# key, label, formula builder (col, prev) or None for section, format
LINES = []


def line(key, label, f, fmt=NUM, bold=False):
	LINES.append((key, label, f, fmt, bold))


def section(label):
	LINES.append((None, label, None, None, True))


section("Timeline")
line("idx", "Model month", lambda c, p: "=1" if p is None else f"={p}4+1")
line("year", "Model year", lambda c, p: f"=INT(({c}4-1)/12)+1")
line("date", "Month", lambda c, p: f"=DATE({START.year},{START.month}+{c}4-1,1)", "mmm yyyy")
section("Checkpoint · AI (count)")
def ramp(key, launch, m1, g):
	"""Zero before launch, the launch-month number on it, then yearly growth."""
	return lambda c, p: (
		f"=IF({c}$4<{a(launch)},0,IF({c}$4={a(launch)},{a(m1)},"
		+ ("0" if p is None else f"{p}{{{key}}}*(1+CHOOSE({c}$5,{a(g + '_g_y1')},{a(g + '_g_y2')},{a(g + '_g_y3')}))")
		+ "))"
	)


line("ai_new", "New", ramp("ai_new", "ai_launch", "ai_new_m1", "ai"), NUM1)
line("ai_rep", "Repeat", lambda c, p: "=0" if p is None else f"={p}{{ai_total}}*{a('ai_repeat')}", NUM1)
line("ai_total", "Total AI checkpoints", lambda c, p: f"={c}{{ai_new}}+{c}{{ai_rep}}", NUM1, True)
section("Checkpoint · Pro (count)")
line("pro_new", "New", ramp("pro_new", "pro_launch", "pro_new_m1", "pro"), NUM1)
line("pro_up", "Upgraded from AI", lambda c, p: "=0" if p is None else f"={p}{{ai_total}}*{a('ai_to_pro')}", NUM1)
line("pro_rep", "Repeat", lambda c, p: "=0" if p is None else f"={p}{{pro_total}}*{a('pro_repeat')}", NUM1)
line("pro_demand", "Demand", lambda c, p: f"={c}{{pro_new}}+{c}{{pro_up}}+{c}{{pro_rep}}", NUM1)
line("cur_pool", "Curators on the platform", lambda c, p: f"={a('cur_m1')}" if p is None else f"={p}{{cur_pool}}*(1-{a('cur_churn')})+{a('cur_add')}", NUM1)
line("pro_cap", "Capacity: curators × checkpoints each", lambda c, p: f"={c}{{cur_pool}}*{a('pro_per_curator')}", NUM1)
line("pro_total", "Total Pro checkpoints (served)", lambda c, p: f"=MIN({c}{{pro_demand}},{c}{{pro_cap}})", NUM1, True)
line("pro_lost", "Demand turned away — no curator", lambda c, p: f"={c}{{pro_demand}}-{c}{{pro_total}}", NUM1)
line("pro_served", "Share of demand served", lambda c, p: f"=IF({c}{{pro_demand}}=0,1,{c}{{pro_total}}/{c}{{pro_demand}})", PCT)
line("curators", "Active curators", lambda c, p: f"=MIN({c}{{cur_pool}},ROUNDUP({c}{{pro_total}}/{a('pro_per_curator')},0))")
section("Paid 1:1 consultations (count)")
line("con", "Paid sessions", ramp("con", "con_launch", "con_m1", "con"), NUM1, True)
line("experts", "Active experts", lambda c, p: f"=ROUNDUP({c}{{con}}/{a('con_per_expert')},0)")
section("Vacancies (count)")
line("vac", "Paid vacancies", lambda c, p: f"={a('vac_m1')}" if p is None else f"={p}{{vac}}*(1+{a('vac_g')})", NUM1)
section("GMV — what customers pay ($)")
line("gmv_ai", "Checkpoint · AI", lambda c, p: f"={c}{{ai_total}}*{a('ai_price')}", USD)
line("gmv_pro", "Checkpoint · Pro", lambda c, p: f"={c}{{pro_total}}*{a('pro_gmv')}", USD)
line("gmv_con", "1:1 consultations", lambda c, p: f"={c}{{con}}*{a('con_price')}", USD)
line("gmv_vac", "Vacancies", lambda c, p: f"={c}{{vac}}*{a('vac_price')}", USD)
line("gmv", "Total GMV", lambda c, p: f"=SUM({c}{{gmv_ai}}:{c}{{gmv_vac}})", USD, True)
section("Net revenue ($)")
line("rev_ai", "Checkpoint · AI", lambda c, p: f"={c}{{gmv_ai}}*(1-{a('refund_rate')})", USD)
line("rev_pro", "Checkpoint · Pro, platform share", lambda c, p: f"={c}{{gmv_pro}}*{a('take_rate')}*(1-{a('refund_rate')})", USD)
line("rev_con", "1:1 consultations, commission", lambda c, p: f"={c}{{gmv_con}}*{a('con_take')}*(1-{a('refund_rate')})", USD)
line("rev_vac", "Vacancies", lambda c, p: f"={c}{{gmv_vac}}", USD)
line("rev", "Net revenue", lambda c, p: f"=SUM({c}{{rev_ai}}:{c}{{rev_vac}})", USD, True)
line("payout", "Memo: paid out to curators and experts", lambda c, p: f"=({c}{{gmv_pro}}*(1-{a('take_rate')})+{c}{{gmv_con}}*(1-{a('con_take')}))*(1-{a('refund_rate')})", USD)
section("Cost of revenue ($)")
line("c_card", "Card fees", lambda c, p: f"=-(({c}{{gmv_ai}}+{c}{{gmv_pro}}+{c}{{gmv_con}})*{a('stripe_pct')}+({c}{{ai_total}}+{c}{{pro_total}}+{c}{{con}})*{a('stripe_fixed')})", USD)
line("c_paddle", "Paddle fees", lambda c, p: f"=-({c}{{gmv_vac}}*{a('paddle_pct')}+{c}{{vac}}*{a('paddle_fixed')})", USD)
line("c_payout", "Payout fees", lambda c, p: f"=-({c}{{payout}}*{a('payout_pct')}+({c}{{pro_total}}*(1-{a('refund_rate')})+{c}{{experts}})*{a('payout_fixed')}+({c}{{curators}}+{c}{{experts}})*{a('connect_monthly')})", USD)
line("c_video", "Video calls", lambda c, p: f"=-({c}{{pro_total}}*{a('calls')}*{a('call_minutes')}*{a('call_people')}+{c}{{con}}*{a('con_minutes')}*2)*{a('daily_rate')}", USD)
line("c_ai", "AI model", lambda c, p: f"=-({c}{{ai_total}}+{c}{{pro_total}})*{a('ai_cost')}", USD)
line("cogs", "Cost of revenue", lambda c, p: f"=SUM({c}{{c_card}}:{c}{{c_ai}})", USD, True)
line("gp", "Gross profit", lambda c, p: f"={c}{{rev}}+{c}{{cogs}}", USD, True)
line("gm", "Gross margin", lambda c, p: f'=IF({c}{{rev}}=0,0,{c}{{gp}}/{c}{{rev}})', PCT)
section("Operating costs ($)")
line("o_infra", "Infrastructure & SaaS", lambda c, p: f"=-CHOOSE({c}$5,{a('infra_y1')},{a('infra_y2')},{a('infra_y3')})", USD)
line("o_pay", "Team payroll", lambda c, p: f"=-CHOOSE({c}$5,{a('payroll_y1')},{a('payroll_y2')},{a('payroll_y3')})", USD)
line("o_mkt", "Marketing: community + CAC × new buyers", lambda c, p: f"=-({a('mkt_fixed')}+{c}{{ai_new}}*{a('cac_ai')}+{c}{{pro_new}}*{c}{{pro_served}}*{a('cac_pro')}+{c}{{con}}*{a('cac_con')})", USD)
line("o_admin", "Legal, accounting, banking", lambda c, p: f"=-{a('admin')}", USD)
line("opex", "Operating costs", lambda c, p: f"=SUM({c}{{o_infra}}:{c}{{o_admin}})", USD, True)
section("Cash ($)")
line("ebitda", "Operating cash flow", lambda c, p: f"={c}{{gp}}+{c}{{opex}}", USD, True)
line("fund", "Funding received", lambda c, p: f"=IF({c}4={a('funding_month')},{a('funding')},0)", USD)
line("net", "Net cash flow", lambda c, p: f"={c}{{ebitda}}+{c}{{fund}}", USD)
line("cash", "Cash at month end", lambda c, p: f"={a('start_cash')}+{c}{{net}}" if p is None else f"={p}{{cash}}+{c}{{net}}", USD, True)
line("burn", "Net burn", lambda c, p: f"=MAX(0,-{c}{{ebitda}})", USD)
line("runway", "Runway at this burn (months)", lambda c, p: f'=IF({c}{{burn}}=0,"",MAX(0,{c}{{cash}})/{c}{{burn}})', NUM1)
line("cash_nofund", "Cash at month end without funding", lambda c, p: f"={a('start_cash')}+{c}{{ebitda}}" if p is None else f"={p}{{cash_nofund}}+{c}{{ebitda}}", USD)
line("positive", "Operating cash flow ≥ 0 (1 = yes)", lambda c, p: f"=IF({c}{{ebitda}}>=0,1,0)")
line("cum_rev", "Cumulative net revenue", lambda c, p: f"={c}{{rev}}" if p is None else f"={p}{{cum_rev}}+{c}{{rev}}", USD)

ROW = {}
r = 3
for key, *_ in LINES:
	if key:
		ROW[key] = r
	r += 1
assert ROW["idx"] == 4 and ROW["year"] == 5, "formulas reference rows 4 and 5 directly"

r = 3
for key, label, f, fmt, bold in LINES:
	cell = M.cell(r, 1, label)
	cell.font = BOLD if bold else BLACK
	if key is None:
		for col in range(1, FIRST + MONTHS):
			M.cell(r, col).fill = SECTION_FILL
		r += 1
		continue
	for i, c in enumerate(cols):
		p = cols[i - 1] if i else None
		formula = f(c, p).replace("{c}", c)
		for k, v in ROW.items():
			formula = formula.replace("{" + k + "}", str(v))
		x = M.cell(r, FIRST + i, formula)
		x.number_format = fmt
		x.font = BOLD if bold else BLACK
		if bold and key not in ("ai_total", "pro_total"):
			x.border = THIN
	r += 1

M.column_dimensions["A"].width = 38
M.column_dimensions["B"].width = 2
for c in cols:
	M.column_dimensions[c].width = 11
M.freeze_panes = "C7"

last = cols[-1]
chart = LineChart()
chart.title = "Cash at month end (burn-down)"
chart.y_axis.title = "$"
chart.height, chart.width = 8, 22
chart.add_data(Reference(M, min_col=FIRST, max_col=FIRST + MONTHS - 1, min_row=ROW["cash"]), from_rows=True, titles_from_data=False)
chart.set_categories(Reference(M, min_col=FIRST, max_col=FIRST + MONTHS - 1, min_row=ROW["idx"]))
chart.legend = None
M.add_chart(chart, f"C{r + 2}")

bars = BarChart()
bars.title = "Net revenue vs. all costs"
bars.height, bars.width = 8, 22
bars.add_data(Reference(M, min_col=1, max_col=FIRST + MONTHS - 1, min_row=ROW["rev"]), from_rows=True, titles_from_data=True)
bars.add_data(Reference(M, min_col=1, max_col=FIRST + MONTHS - 1, min_row=ROW["opex"]), from_rows=True, titles_from_data=True)
bars.set_categories(Reference(M, min_col=FIRST, max_col=FIRST + MONTHS - 1, min_row=ROW["idx"]))
M.add_chart(bars, f"C{r + 19}")

# ---------------------------------------------------------------- Annual

Y = wb.create_sheet("Annual Summary", 1)
Y["A1"] = "Annual summary"
Y["A1"].font = TITLE
Y["A2"] = '="Scenario: "&Assumptions!$C$2'
Y["A2"].font = BOLD
for col, text in zip("ABCD", ["", "Year 1", "Year 2", "Year 3"]):
	c = Y[f"{col}3"]
	c.value = text
	c.font = HEAD
	c.fill = HEAD_FILL
Y["A4"] = "Starts"
for i, col in enumerate("BCD"):
	Y[f"{col}4"] = f"=DATE({START.year},{START.month}+{12 * i},1)"
	Y[f"{col}4"].number_format = "mmm yyyy"

span = f"Monthly!$C${{r}}:${last}${{r}}"
yr = f"Monthly!$C$5:${last}$5"
SUMMARY = [
	("Checkpoints · AI", "ai_total", NUM, "sum"),
	("Checkpoints · Pro", "pro_total", NUM, "sum"),
	("Pro demand turned away for lack of curators", "pro_lost", NUM, "sum"),
	("Curators on the platform at year end", "cur_pool", NUM, "end"),
	("Paid 1:1 sessions", "con", NUM, "sum"),
	("Paid vacancies", "vac", NUM, "sum"),
	("GMV", "gmv", USD, "sum"),
	("Net revenue", "rev", USD, "sum"),
	("Paid out to curators", "payout", USD, "sum"),
	("Gross profit", "gp", USD, "sum"),
	("Operating costs", "opex", USD, "sum"),
	("Operating cash flow", "ebitda", USD, "sum"),
	("Funding received", "fund", USD, "sum"),
	("Cash at year end", "cash", USD, "end"),
	("Average monthly net burn", "burn", USD, "avg"),
	("Net revenue run-rate, last month × 12", "rev", USD, "arr"),
]
for i, (label, key, fmt, kind) in enumerate(SUMMARY, start=5):
	Y.cell(i, 1, label).font = BOLD if kind != "sum" or key in ("rev", "ebitda") else BLACK
	for j, col in enumerate("BCD"):
		rng = span.format(r=ROW[key])
		if kind == "sum":
			f = f"=SUMIFS({rng},{yr},{j + 1})"
		elif kind == "avg":
			f = f"=AVERAGEIFS({rng},{yr},{j + 1})"
		elif kind == "end":
			f = f"=INDEX({rng},1,{12 * (j + 1)})"
		else:
			f = f"=INDEX({rng},1,{12 * (j + 1)})*12"
		c = Y[f"{col}{i}"]
		c.value = f
		c.number_format = fmt
		c.font = GREEN
i += 2
Y.cell(i, 1, "Lowest cash balance over 36 months").font = BOLD
Y.cell(i, 2, f"=MIN(Monthly!$C${ROW['cash']}:${last}${ROW['cash']})").number_format = USD
Y.cell(i + 1, 1, "First model month with operating cash flow ≥ 0").font = BOLD
Y.cell(i + 1, 2, f'=IFERROR(MATCH(1,Monthly!$C${ROW["positive"]}:${last}${ROW["positive"]},0),"not within 36 months")')
Y.cell(i + 2, 1, "Cash needed before break-even (deepest point without funding)").font = BOLD
Y.cell(i + 2, 2, f"=MIN(0,MIN(Monthly!$C${ROW['cash_nofund']}:${last}${ROW['cash_nofund']}))")
Y.cell(i + 2, 2).number_format = USD
Y.cell(i + 2, 3, "negative = the gap to fund").font = BLACK
Y.column_dimensions["A"].width = 58
for col in "BCD":
	Y.column_dimensions[col].width = 16

# ---------------------------------------------------------------- Read me

N = wb.create_sheet("Read Me", 0)
NOTES = [
	("GDHub financial model", TITLE),
	(f"36 months from {START.strftime('%B %Y')}. Generated by docs/finance/build_model.py — edit the script or the blue cells, never the formulas.", BLACK),
	("", BLACK),
	("How to use", BOLD),
	("1. Pick a scenario in Assumptions!B2 (1 Low, 2 Base, 3 High). Everything recalculates.", BLACK),
	("2. Blue text = an input. Yellow fill = a guess the founder has to replace with a real number.", BLACK),
	("3. Black = formula. Green = a pull from another sheet.", BLACK),
	("", BLACK),
	("Sheets", BOLD),
	("Annual Summary — the page for investors: revenue, burn, cash, break-even.", BLACK),
	("Assumptions — every number the model runs on, with its source.", BLACK),
	("Unit Economics — what one AI and one Pro checkpoint earn after fees, video and AI.", BLACK),
	("Monthly — 36 columns: volumes, GMV, revenue, costs, cash, burn, runway, plus the burn-down chart.", BLACK),
	("", BLACK),
	("Revenue logic", BOLD),
	("Launch order: 1) Checkpoint · Pro, user ↔ expert; 2) Checkpoint · AI curator; 3) paid 1:1 consultations, Preply-style. Launch months are inputs.", BLACK),
	("GMV is what customers pay. Net revenue is what the platform keeps: the whole AI price, 20% of a Pro price (curator rate + 25%), the commission on a 1:1 session, the whole vacancy fee.", BLACK),
	("Checkpoints last 28 days, so one month = one checkpoint cycle; repeats and AI→Pro upgrades come from last month's total.", BLACK),
	("Scenarios change only how well we sell — volumes, repeats, CAC. What we pay for infrastructure, people and admin is the same in all three.", BLACK),
	("Marketing = a fixed community budget + CAC × new buyers, so the cost of growth is visible against what a buyer earns (Unit Economics).", BLACK),
	("Not modelled: taxes and VAT (Paddle is merchant of record for vacancies; Stripe is not), currency risk, chargebacks, curator payouts being unbuilt.", BLACK),
	("", BLACK),
	("Example of an input row (Assumptions)", BOLD),
	("New AI checkpoints, month 1 | Low 5 | Base 10 | High 20 | checkpoints | 'Guess. Replace with the first Season's real number'", BLACK),
]
for i, (text, font) in enumerate(NOTES, start=1):
	N.cell(i, 1, text).font = font
N.column_dimensions["A"].width = 140

for ws in wb.worksheets:
	ws.sheet_view.showGridLines = ws.title not in ("Read Me",)
	for rw in ws.iter_rows():
		for c in rw:
			if c.font is None or c.font.name != FONT:
				c.font = Font(name=FONT, bold=c.font.bold if c.font else False, color=c.font.color if c.font else None, size=c.font.size if c.font else 11)

A["B2"].comment = Comment("1 = Low, 2 = Base, 3 = High", "GDHub")
wb.calculation.fullCalcOnLoad = True
wb.save(OUT)
print(OUT)
