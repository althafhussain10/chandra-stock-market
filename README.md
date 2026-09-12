# Nifty Watcher

Build a stock market screener dashboard web app (Responsive) for NSE Nifty 500 stocks.

TECH: React + Tailwind frontend, Supabase for backend (Postgres tables + Edge Functions + pg_cron for scheduled jobs).

DATABASE TABLES:

1. stocks (ticker, name, sector, subsector, exchange)

2. daily_candles (ticker, date, open, high, low, close, volume)

3. monthly_candles (ticker, month_end_date, open, high, low, close, ema20)

4. weekly_candles (ticker, week_end_date, open, high, low, close)

5. screener_results (id, screener_name, ticker, trigger_date, details jsonb, created_at)

6. watchlist (ticker, added_at)

DASHBOARD LAYOUT:

- Left sidebar with 5 screener tabs:

  1. "All-Time High Breakouts"

  2. "Monthly EMA20 Breakout"

  3. "Today's Breakouts (5D/20D/60D High)"

  4. "High Volume Today"

  5. "Sector Strength"

- Each tab shows a sortable, searchable data table (ticker, key trigger values, date, % return since trigger, a "star" button to add to watchlist)

- Top bar: last data refresh timestamp + manual "Refresh Data" button

- A "Watchlist" tab showing starred stocks across all screeners

- Clean, dense, trading-terminal aesthetic (dark mode default, monospace numbers, green/red for gains/losses)

- Mobile responsive but optimized for desktop/wide tables

For now, populate tables with realistic mock data for ~30 sample Nifty stocks so the UI is fully browsable. Do not wire up real data fetching yet — that's the next step.

Now replace the mock data with real screening logic using Supabase Edge Functions, scheduled with pg_cron to run once daily after market close (3:35 PM IST) plus a manual trigger button.

DATA SOURCE: Call [YOUR STOCK DATA API ENDPOINT/KEY HERE] to fetch daily OHLCV for all tickers in the stocks table. Store into daily_candles. Derive weekly_candles (resample by week) and monthly_candles (resample by month, plus EMA20 on monthly close, computed as: EMA20_t = close_t * (2/21) + EMA20_(t-1) * (19/21), seeded from SMA20).

IMPLEMENT THESE 5 SCREENERS AS EDGE FUNCTIONS, writing matches into screener_results:

1. ATH Breakout: yesterday's close < all-time-high (max close ever for that ticker up to yesterday) AND today's close > that all-time-high.

2. Monthly EMA20 Breakout: last completed month's open < that month's monthly EMA20 AND last month's close > monthly EMA20 AND current month's close > last month's high. Also track: Date1 = first daily close after last-month-end that closes above last month's high; Date2 = first daily close after Date1 that closes above Date1's high; STL_Hit = first later month where monthly close < previous month's monthly low (trailing stop). Store Date1, Date2, STL_Hit, and Return% (from Date1 close to now or STL exit) in the details jsonb.

3. Today's Breakout: today's close > highest close of last 5 days AND > highest close of last 20 days AND > highest close of last 60 days.

4. High Volume Today: rank all stocks by today's volume, store top 10.

5. Sector Strength: group stocks by sector/subsector. Compute average % price change per sector over: last 3 months (daily granularity), last 3 months (weekly granularity), last 6 months (monthly granularity). Rank sectors by strength each period. Also flag any sector whose weekly trend flips from negative to positive in the most recent week ("turning bullish") vs the prior week.

Show loading states and error handling in the UI while functions run. Add a small badge on each tab showing count of new matches since last refresh.

Add an admin panel to the existing stock screener app, accessible at /admin, protected by Supabase auth (single admin role — email/password login, no public signup).

ADMIN PANEL SECTIONS:

1. STOCK UNIVERSE MANAGEMENT

   - Table view of the `stocks` table (ticker, name, sector, subsector, exchange, active toggle)

   - Add/edit/delete individual stocks

   - Bulk CSV upload to replace or append the Nifty 500 ticker list

   - Toggle a stock active/inactive without deleting it (inactive stocks are skipped by screeners)

2. DATA SOURCE & REFRESH CONTROL

   - Field to store/update the stock data API key and endpoint (encrypted in Supabase secrets, not plain table)

   - "Run Full Data Refresh Now" button — manually triggers the daily Edge Function instead of waiting for the cron

   - Show last successful refresh timestamp, last error (if any), and which tickers failed to fetch in the last run

   - Toggle to enable/disable the daily auto-refresh (pg_cron job) without deleting it

3. SCREENER CONFIG

   - List all 5 screeners with an on/off toggle each (so a broken one can be disabled without redeploying)

   - Editable numeric thresholds where relevant (e.g. EMA period, breakout lookback days: 5/20/60, high-volume top-N count, sector strength lookback windows)

   - "Run This Screener Now" button per screener for manual re-trigger

4. LOGS

   - Table of past Edge Function runs: screener name, run timestamp, status (success/fail), rows written, error message if failed

   - Filter by screener and date range

5. USER/WATCHLIST OVERSIGHT (if multi-user later)

   - Simple table of current watchlist entries across the app for visibility

UI: match the existing dark-mode trading dashboard aesthetic. Put admin nav in a separate sidebar section, clearly distinguished from the main screener dashboard (e.g. a red/amber "ADMIN" badge in the header so it's obviously not the public view).

Ensure all admin routes are protected — redirect to login if not authenticated as admin.

Note: Based on api and criteria already uploaded it will be work in my website

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://nifty-radar-app.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a94832c0-70da-472a-9e71-12009752b08e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
