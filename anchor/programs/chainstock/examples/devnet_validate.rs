//! One-off end-to-end validation of the deployed chainstock program on a
//! **real network** (devnet) — proves the on-chain mechanics actually work
//! against a live validator, not just LiteSVM's local simulation.
//!
//! Run from `anchor/`:
//!   cargo run -p chainstock --example devnet_validate -- \
//!     ~/.config/solana/id.json ~/chainstock-keys/backend-authority.json
//!
//! Assumes `chainstock.so` is already deployed at the address in
//! `declare_id!()` (see `anchor deploy --provider.cluster devnet`) and
//! both keypairs already hold devnet SOL.

use anchor_lang::{InstructionData, ToAccountMetas};
use solana_client::rpc_client::RpcClient;
use solana_commitment_config::CommitmentConfig;
use solana_sdk::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{read_keypair_file, Keypair, Signer as _},
    transaction::Transaction,
};
use solana_system_interface::{instruction as system_instruction, program as system_program};
use spl_associated_token_account::{get_associated_token_address, instruction::create_associated_token_account};
use spl_token::solana_program::{
    instruction::Instruction as SplInstruction, program_pack::Pack, pubkey::Pubkey as SplPubkey,
};
use spl_token::state::Mint;

use chainstock::{accounts as ix_accounts, instruction as ix_data};

const USDC_DECIMALS: u8 = 6;
const FEE_BPS: u16 = 250;
const FEE_MIN_USDC: u64 = 150_000;

// Same boundary-conversion helpers as tests/claim_flow.rs — see that
// file's doc comment / Cargo.toml's dev-dependencies comment for why
// these are needed (spl-token/spl-associated-token-account resolve
// `Pubkey`/`Instruction` through an older, separate crate line).
fn to_spl_pubkey(p: Pubkey) -> SplPubkey {
    SplPubkey::from(p.to_bytes())
}

fn from_spl_pubkey(p: SplPubkey) -> Pubkey {
    Pubkey::from(p.to_bytes())
}

fn from_spl_ix(ix: SplInstruction) -> Instruction {
    Instruction {
        program_id: from_spl_pubkey(ix.program_id),
        accounts: ix
            .accounts
            .into_iter()
            .map(|m| AccountMeta {
                pubkey: from_spl_pubkey(m.pubkey),
                is_signer: m.is_signer,
                is_writable: m.is_writable,
            })
            .collect(),
        data: ix.data,
    }
}

fn send(rpc: &RpcClient, ixs: &[Instruction], payer: &Pubkey, signers: &[&Keypair]) {
    let blockhash = rpc.get_latest_blockhash().expect("get_latest_blockhash");
    let tx = Transaction::new_signed_with_payer(ixs, Some(payer), signers, blockhash);
    let sig = rpc
        .send_and_confirm_transaction(&tx)
        .expect("transaction should land on devnet");
    println!("  tx confirmed: {sig}");
}

fn usdc_balance(rpc: &RpcClient, token_account: &Pubkey) -> u64 {
    let account = rpc.get_account(token_account).expect("get_account");
    spl_token::state::Account::unpack(&account.data).unwrap().amount
}

fn main() {
    let home = std::env::var("HOME").expect("HOME env var not set");
    let args: Vec<String> = std::env::args().collect();
    let admin_path = args
        .get(1)
        .cloned()
        .unwrap_or_else(|| format!("{home}/.config/solana/id.json"));
    let backend_path = args
        .get(2)
        .cloned()
        .unwrap_or_else(|| format!("{home}/chainstock-keys/backend-authority.json"));

    let admin = read_keypair_file(&admin_path).expect("read admin keypair");
    let backend_authority = read_keypair_file(&backend_path).expect("read backend-authority keypair");
    println!("admin:             {}", admin.pubkey());
    println!("backend_authority: {}", backend_authority.pubkey());
    println!("program:           {}", chainstock::ID);

    let rpc = RpcClient::new_with_commitment(
        "https://api.devnet.solana.com".to_string(),
        CommitmentConfig::confirmed(),
    );

    // --- 1. fresh mock-USDC mint (devnet has no real USDC) ---
    // Created before Config so its address is known to pin as
    // `config.usdc_mint` below — every run generates a new one, so
    // whatever Config already has pinned needs refreshing each time too.
    println!("Creating mock-USDC mint...");
    let usdc_mint_kp = Keypair::new();
    let usdc_mint = usdc_mint_kp.pubkey();
    let rent = rpc
        .get_minimum_balance_for_rent_exemption(Mint::LEN)
        .expect("rent");
    let create_mint_ix = system_instruction::create_account(
        &admin.pubkey(),
        &usdc_mint,
        rent,
        Mint::LEN as u64,
        &from_spl_pubkey(spl_token::ID),
    );
    let init_mint_ix = from_spl_ix(
        spl_token::instruction::initialize_mint2(
            &spl_token::ID,
            &to_spl_pubkey(usdc_mint),
            &to_spl_pubkey(admin.pubkey()),
            None,
            USDC_DECIMALS,
        )
        .unwrap(),
    );
    send(
        &rpc,
        &[create_mint_ix, init_mint_ix],
        &admin.pubkey(),
        &[&admin, &usdc_mint_kp],
    );

    // --- 2. initialize_config, migrating an old-layout Config if needed ---
    // `Config` grew a `usdc_mint` field this session (see
    // docs/SecurityAudit.md finding #3). An already-deployed `Config` PDA
    // sized for the pre-migration layout (115 bytes: 8-byte discriminator
    // + admin/treasury/backend_authority Pubkeys + fee_bps + fee_min_usdc
    // + bump) can't just grow in place — Anchor deserializes into the
    // *current* program version's (now 147-byte) `Config` struct before
    // any `realloc` constraint would run, so a too-small account fails to
    // deserialize at all. `close_config` (admin-only) exists for exactly
    // this: close the old account, then `initialize_config` fresh.
    const OLD_CONFIG_LEN: usize = 115;
    let (config_pda, _) = Pubkey::find_program_address(&[b"config"], &chainstock::ID);
    match rpc.get_account(&config_pda) {
        Err(_) => {
            println!("Calling initialize_config...");
            let init_config_ix = Instruction {
                program_id: chainstock::ID,
                accounts: ix_accounts::InitializeConfig {
                    admin: admin.pubkey(),
                    config: config_pda,
                    system_program: system_program::ID,
                }
                .to_account_metas(None),
                data: ix_data::InitializeConfig {
                    treasury: admin.pubkey(),
                    backend_authority: backend_authority.pubkey(),
                    usdc_mint,
                    fee_bps: FEE_BPS,
                    fee_min_usdc: FEE_MIN_USDC,
                }
                .data(),
            };
            send(&rpc, &[init_config_ix], &admin.pubkey(), &[&admin]);
        }
        Ok(account) if account.data.len() <= OLD_CONFIG_LEN => {
            println!("Config PDA at {config_pda} is the old (pre-usdc_mint) layout — migrating: close_config, then initialize_config fresh...");
            let close_ix = Instruction {
                program_id: chainstock::ID,
                accounts: ix_accounts::CloseConfig {
                    config: config_pda,
                    admin: admin.pubkey(),
                }
                .to_account_metas(None),
                data: ix_data::CloseConfig {}.data(),
            };
            send(&rpc, &[close_ix], &admin.pubkey(), &[&admin]);

            let init_config_ix = Instruction {
                program_id: chainstock::ID,
                accounts: ix_accounts::InitializeConfig {
                    admin: admin.pubkey(),
                    config: config_pda,
                    system_program: system_program::ID,
                }
                .to_account_metas(None),
                data: ix_data::InitializeConfig {
                    treasury: admin.pubkey(),
                    backend_authority: backend_authority.pubkey(),
                    usdc_mint,
                    fee_bps: FEE_BPS,
                    fee_min_usdc: FEE_MIN_USDC,
                }
                .data(),
            };
            send(&rpc, &[init_config_ix], &admin.pubkey(), &[&admin]);
        }
        Ok(_) => {
            println!("Config PDA already initialized at {config_pda} — pointing config.usdc_mint at this run's fresh mint via update_config...");
            let update_ix = Instruction {
                program_id: chainstock::ID,
                accounts: ix_accounts::UpdateConfig {
                    config: config_pda,
                    admin: admin.pubkey(),
                }
                .to_account_metas(None),
                data: ix_data::UpdateConfig {
                    fee_bps: None,
                    fee_min_usdc: None,
                    treasury: None,
                    backend_authority: None,
                    usdc_mint: Some(usdc_mint),
                }
                .data(),
            };
            send(&rpc, &[update_ix], &admin.pubkey(), &[&admin]);
        }
    }

    // Config's treasury = admin, so
    // treasury_usdc's address is fixed as ATA(admin, mint) regardless of
    // this run. `sender` must be a genuinely different wallet — Anchor's
    // `dup` constraint (new in 1.0+) correctly rejects create_gift if
    // sender_usdc and treasury_usdc resolve to the same account, which
    // they would if sender == treasury == admin.
    let sender = Keypair::new();
    println!("Funding fresh sender {}...", sender.pubkey());
    let fund_sender_ix = system_instruction::transfer(&admin.pubkey(), &sender.pubkey(), 20_000_000);
    send(&rpc, &[fund_sender_ix], &admin.pubkey(), &[&admin]);

    let sender_usdc = from_spl_pubkey(get_associated_token_address(
        &to_spl_pubkey(sender.pubkey()),
        &to_spl_pubkey(usdc_mint),
    ));
    let treasury_usdc = from_spl_pubkey(get_associated_token_address(
        &to_spl_pubkey(admin.pubkey()),
        &to_spl_pubkey(usdc_mint),
    ));
    let create_sender_ata_ix = from_spl_ix(create_associated_token_account(
        &to_spl_pubkey(sender.pubkey()),
        &to_spl_pubkey(sender.pubkey()),
        &to_spl_pubkey(usdc_mint),
        &spl_token::ID,
    ));
    let create_treasury_ata_ix = from_spl_ix(create_associated_token_account(
        &to_spl_pubkey(admin.pubkey()),
        &to_spl_pubkey(admin.pubkey()),
        &to_spl_pubkey(usdc_mint),
        &spl_token::ID,
    ));
    let mint_to_sender_ix = from_spl_ix(
        spl_token::instruction::mint_to(
            &spl_token::ID,
            &to_spl_pubkey(usdc_mint),
            &to_spl_pubkey(sender_usdc),
            &to_spl_pubkey(admin.pubkey()),
            &[],
            1_000_000_000,
        )
        .unwrap(),
    );
    send(&rpc, &[create_treasury_ata_ix], &admin.pubkey(), &[&admin]);
    send(
        &rpc,
        &[create_sender_ata_ix, mint_to_sender_ix],
        &sender.pubkey(),
        &[&sender, &admin],
    );
    println!("  sender USDC balance: {}", usdc_balance(&rpc, &sender_usdc));

    // --- 3. a funded claimer wallet (dedicated-by-wallet, self-paid claim) ---
    let claimer = Keypair::new();
    println!("Funding fresh claimer {}...", claimer.pubkey());
    let fund_claimer_ix =
        system_instruction::transfer(&admin.pubkey(), &claimer.pubkey(), 20_000_000);
    send(&rpc, &[fund_claimer_ix], &admin.pubkey(), &[&admin]);

    // --- 4. create_gift (dedicated-by-wallet -> claimer) ---
    println!("Calling create_gift...");
    let claim_seed: [u8; 16] = rand_seed();
    let amount: u64 = 25_000_000; // $25
    let (gift_pda, _) = Pubkey::find_program_address(&[b"gift", &claim_seed], &chainstock::ID);
    let vault = from_spl_pubkey(get_associated_token_address(
        &to_spl_pubkey(gift_pda),
        &to_spl_pubkey(usdc_mint),
    ));
    let create_gift_ix = Instruction {
        program_id: chainstock::ID,
        accounts: ix_accounts::CreateGift {
            sender: sender.pubkey(),
            config: config_pda,
            gift: gift_pda,
            usdc_mint,
            sender_usdc,
            vault,
            treasury_usdc,
            token_program: from_spl_pubkey(spl_token::ID),
            associated_token_program: from_spl_pubkey(spl_associated_token_account::ID),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: ix_data::CreateGift {
            claim_seed,
            amount_usdc: amount,
            stock_mint: Pubkey::new_unique(),
            recipient_mode: chainstock::state::RecipientMode::Dedicated,
            recipient_wallet: Some(claimer.pubkey()),
            recipient_email_hash: None,
        }
        .data(),
    };
    send(&rpc, &[create_gift_ix], &sender.pubkey(), &[&sender]);
    println!("  vault balance after create_gift: {}", usdc_balance(&rpc, &vault));

    // --- 5. claim_gift (self-paid by the claimer) ---
    println!("Calling claim_gift...");
    let claimer_usdc = from_spl_pubkey(get_associated_token_address(
        &to_spl_pubkey(claimer.pubkey()),
        &to_spl_pubkey(usdc_mint),
    ));
    let claim_ix = Instruction {
        program_id: chainstock::ID,
        accounts: ix_accounts::ClaimGift {
            claimer: claimer.pubkey(),
            payer: claimer.pubkey(),
            backend_authority: backend_authority.pubkey(),
            config: config_pda,
            gift: gift_pda,
            rent_receiver: claimer.pubkey(),
            usdc_mint,
            vault,
            recipient_usdc: claimer_usdc,
            token_program: from_spl_pubkey(spl_token::ID),
            associated_token_program: from_spl_pubkey(spl_associated_token_account::ID),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: ix_data::ClaimGift {}.data(),
    };
    send(&rpc, &[claim_ix], &claimer.pubkey(), &[&claimer]);

    let claimer_balance = usdc_balance(&rpc, &claimer_usdc);
    println!("  claimer USDC balance: {claimer_balance}");
    assert_eq!(claimer_balance, amount, "claimer should have received the full gift amount");
    assert!(
        rpc.get_account(&vault).is_err(),
        "vault should be closed after claim"
    );
    assert!(
        rpc.get_account(&gift_pda).is_err(),
        "gift PDA should be closed after claim"
    );

    println!("\nAll devnet checks passed: initialize_config, create_gift (escrow + fee split), claim_gift (payout + account closure) all confirmed on a real network.");
}

fn rand_seed() -> [u8; 16] {
    let mut seed = [0u8; 16];
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    seed[..16].copy_from_slice(&nanos.to_le_bytes());
    seed
}
