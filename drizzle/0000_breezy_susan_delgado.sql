CREATE TABLE IF NOT EXISTS "claim_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"claim_seed" text NOT NULL,
	"wallet_address" text,
	"ip_hash" text,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"captcha_verified" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gifts" (
	"claim_seed" text PRIMARY KEY NOT NULL,
	"gift_pda" text NOT NULL,
	"sender_wallet" text NOT NULL,
	"stock_mint" text NOT NULL,
	"stock_symbol" text NOT NULL,
	"amount_usdc" bigint NOT NULL,
	"fee_usdc" bigint NOT NULL,
	"recipient_mode" text NOT NULL,
	"recipient_wallet" text,
	"recipient_email" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"message" text,
	"theme" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"create_tx_signature" text NOT NULL,
	"claim_tx_signature" text,
	"cancel_tx_signature" text
);
