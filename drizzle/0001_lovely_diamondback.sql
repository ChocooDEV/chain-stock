CREATE TABLE IF NOT EXISTS "token_liquidity" (
	"mint" text PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"tradable" boolean NOT NULL,
	"price_impact_pct" text,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
