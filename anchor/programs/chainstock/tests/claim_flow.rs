//! LiteSVM unit tests for the core create -> claim / cancel flows.
//!
//! UNVERIFIED: written without a local Rust/Solana/Anchor toolchain (see
//! the WSL setup thread in this session) — nobody has run `cargo test`
//! against this file yet. Expect to fix small API-surface mismatches
//! (exact litesvm/spl-token/spl-associated-token-account method names can
//! drift between versions) on the first real run. The program logic these
//! exercise was written carefully against docs/Architecture.md and the
//! solana-dev skill's security checklist, but only a real build/test pass
//! can confirm it actually compiles and behaves as intended.
//!
//! Run with: `cargo test -p chainstock` from `anchor/`, after `anchor build`
//! has produced `target/deploy/chainstock.so`.

use anchor_lang::{InstructionData, ToAccountMetas};
use litesvm::LiteSVM;
use solana_sdk::{
    instruction::{AccountMeta, Instruction},
    program_pack::Pack,
    pubkey::Pubkey,
    signature::{Keypair, Signer as _},
    system_instruction,
    transaction::Transaction,
};
use spl_associated_token_account::{get_associated_token_address, instruction::create_associated_token_account};
use spl_token::state::Mint;

use chainstock::{accounts as ix_accounts, instruction as ix_data};

const USDC_DECIMALS: u8 = 6;
const FEE_BPS: u16 = 250; // 2.5%
const FEE_MIN_USDC: u64 = 150_000; // $0.15

fn program_so_path() -> String {
    format!(
        "{}/../../target/deploy/chainstock.so",
        env!("CARGO_MANIFEST_DIR")
    )
}

struct Fixture {
    svm: LiteSVM,
    admin: Keypair,
    treasury: Keypair,
    backend_authority: Keypair,
    sender: Keypair,
    claimer: Keypair,
    usdc_mint: Pubkey,
    config_pda: Pubkey,
}

fn setup(sender_initial_usdc: u64) -> Fixture {
    let mut svm = LiteSVM::new();
    svm.add_program_from_file(chainstock::ID, program_so_path())
        .expect("load chainstock.so — run `anchor build` first");

    let admin = Keypair::new();
    let treasury = Keypair::new();
    let backend_authority = Keypair::new();
    let sender = Keypair::new();
    let claimer = Keypair::new();

    for kp in [&admin, &treasury, &sender, &claimer] {
        svm.airdrop(&kp.pubkey(), 10_000_000_000).unwrap();
    }

    // --- USDC mint (mock — decimals only need to match real USDC's 6) ---
    let usdc_mint_kp = Keypair::new();
    let usdc_mint = usdc_mint_kp.pubkey();
    let rent = svm.minimum_balance_for_rent_exemption(Mint::LEN);
    let create_mint_ix = system_instruction::create_account(
        &admin.pubkey(),
        &usdc_mint,
        rent,
        Mint::LEN as u64,
        &spl_token::ID,
    );
    let init_mint_ix = spl_token::instruction::initialize_mint2(
        &spl_token::ID,
        &usdc_mint,
        &admin.pubkey(),
        None,
        USDC_DECIMALS,
    )
    .unwrap();
    send(&mut svm, &[create_mint_ix, init_mint_ix], &admin, &[&admin, &usdc_mint_kp]);

    // --- sender's USDC ATA, funded ---
    let sender_usdc = get_associated_token_address(&sender.pubkey(), &usdc_mint);
    let create_sender_ata_ix =
        create_associated_token_account(&admin.pubkey(), &sender.pubkey(), &usdc_mint, &spl_token::ID);
    let mint_to_sender_ix = spl_token::instruction::mint_to(
        &spl_token::ID,
        &usdc_mint,
        &sender_usdc,
        &admin.pubkey(),
        &[],
        sender_initial_usdc,
    )
    .unwrap();
    send(
        &mut svm,
        &[create_sender_ata_ix, mint_to_sender_ix],
        &admin,
        &[&admin],
    );

    // --- treasury's USDC ATA (empty — receives the fee) ---
    let create_treasury_ata_ix = create_associated_token_account(
        &admin.pubkey(),
        &treasury.pubkey(),
        &usdc_mint,
        &spl_token::ID,
    );
    send(&mut svm, &[create_treasury_ata_ix], &admin, &[&admin]);

    // --- initialize_config ---
    let (config_pda, _) = Pubkey::find_program_address(&[b"config"], &chainstock::ID);
    let init_config_ix = Instruction {
        program_id: chainstock::ID,
        accounts: ix_accounts::InitializeConfig {
            admin: admin.pubkey(),
            config: config_pda,
            system_program: solana_sdk::system_program::ID,
        }
        .to_account_metas(None),
        data: ix_data::InitializeConfig {
            treasury: treasury.pubkey(),
            backend_authority: backend_authority.pubkey(),
            fee_bps: FEE_BPS,
            fee_min_usdc: FEE_MIN_USDC,
        }
        .data(),
    };
    send(&mut svm, &[init_config_ix], &admin, &[&admin]);

    Fixture {
        svm,
        admin,
        treasury,
        backend_authority,
        sender,
        claimer,
        usdc_mint,
        config_pda,
    }
}

fn send(svm: &mut LiteSVM, ixs: &[Instruction], payer: &Keypair, signers: &[&Keypair]) {
    let tx = Transaction::new_signed_with_payer(ixs, Some(&payer.pubkey()), signers, svm.latest_blockhash());
    svm.send_transaction(tx).expect("transaction should succeed");
}

fn usdc_balance(svm: &LiteSVM, token_account: &Pubkey) -> u64 {
    let account = svm.get_account(token_account).unwrap();
    spl_token::state::Account::unpack(&account.data).unwrap().amount
}

fn expected_fee(amount_usdc: u64) -> u64 {
    let from_bps = (amount_usdc as u128 * FEE_BPS as u128 / 10_000) as u64;
    from_bps.max(FEE_MIN_USDC)
}

fn create_gift_ix(
    f: &Fixture,
    claim_seed: [u8; 16],
    amount_usdc: u64,
    recipient_wallet: Option<Pubkey>,
    recipient_email_hash: Option<[u8; 32]>,
) -> (Instruction, Pubkey, Pubkey) {
    let (gift_pda, _) = Pubkey::find_program_address(&[b"gift", &claim_seed], &chainstock::ID);
    let vault = get_associated_token_address(&gift_pda, &f.usdc_mint);
    let sender_usdc = get_associated_token_address(&f.sender.pubkey(), &f.usdc_mint);
    let treasury_usdc = get_associated_token_address(&f.treasury.pubkey(), &f.usdc_mint);

    let recipient_mode = if recipient_wallet.is_some() || recipient_email_hash.is_some() {
        chainstock::state::RecipientMode::Dedicated
    } else {
        chainstock::state::RecipientMode::Fcfs
    };

    let ix = Instruction {
        program_id: chainstock::ID,
        accounts: ix_accounts::CreateGift {
            sender: f.sender.pubkey(),
            config: f.config_pda,
            gift: gift_pda,
            usdc_mint: f.usdc_mint,
            sender_usdc,
            vault,
            treasury_usdc,
            token_program: spl_token::ID,
            associated_token_program: spl_associated_token_account::ID,
            system_program: solana_sdk::system_program::ID,
        }
        .to_account_metas(None),
        data: ix_data::CreateGift {
            claim_seed,
            amount_usdc,
            stock_mint: Pubkey::new_unique(),
            recipient_mode,
            recipient_wallet,
            recipient_email_hash,
        }
        .data(),
    };

    (ix, gift_pda, vault)
}

#[test]
fn create_gift_escrows_amount_and_charges_fee() {
    let amount: u64 = 25_000_000; // $25
    let mut f = setup(1_000_000_000);
    let (ix, _gift_pda, vault) = create_gift_ix(&f, [1u8; 16], amount, Some(f.claimer.pubkey()), None);
    send(&mut f.svm, &[ix], &f.sender.clone(), &[&f.sender]);

    let sender_usdc = get_associated_token_address(&f.sender.pubkey(), &f.usdc_mint);
    let treasury_usdc = get_associated_token_address(&f.treasury.pubkey(), &f.usdc_mint);
    let fee = expected_fee(amount);

    assert_eq!(usdc_balance(&f.svm, &vault), amount);
    assert_eq!(usdc_balance(&f.svm, &treasury_usdc), fee);
    assert_eq!(usdc_balance(&f.svm, &sender_usdc), 1_000_000_000 - amount - fee);
}

#[test]
fn claim_gift_rejects_non_matching_claimer() {
    let amount: u64 = 25_000_000;
    let mut f = setup(1_000_000_000);
    let (create_ix, gift_pda, vault) =
        create_gift_ix(&f, [2u8; 16], amount, Some(f.claimer.pubkey()), None);
    send(&mut f.svm, &[create_ix], &f.sender.clone(), &[&f.sender]);

    // A third party (not gift.recipient_wallet) tries to claim.
    let attacker = Keypair::new();
    f.svm.airdrop(&attacker.pubkey(), 10_000_000_000).unwrap();

    let attacker_usdc = get_associated_token_address(&attacker.pubkey(), &f.usdc_mint);
    let claim_ix = Instruction {
        program_id: chainstock::ID,
        accounts: ix_accounts::ClaimGift {
            claimer: attacker.pubkey(),
            payer: attacker.pubkey(),
            backend_authority: f.backend_authority.pubkey(),
            config: f.config_pda,
            gift: gift_pda,
            rent_receiver: attacker.pubkey(),
            usdc_mint: f.usdc_mint,
            vault,
            recipient_usdc: attacker_usdc,
            token_program: spl_token::ID,
            associated_token_program: spl_associated_token_account::ID,
            system_program: solana_sdk::system_program::ID,
        }
        .to_account_metas(None),
        data: ix_data::ClaimGift {}.data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[claim_ix],
        Some(&attacker.pubkey()),
        &[&attacker],
        f.svm.latest_blockhash(),
    );
    let result = f.svm.send_transaction(tx);
    assert!(result.is_err(), "claim from a non-recipient wallet must fail");
}

#[test]
fn claim_gift_pays_out_to_the_dedicated_wallet() {
    let amount: u64 = 25_000_000;
    let mut f = setup(1_000_000_000);
    let (create_ix, gift_pda, vault) =
        create_gift_ix(&f, [3u8; 16], amount, Some(f.claimer.pubkey()), None);
    send(&mut f.svm, &[create_ix], &f.sender.clone(), &[&f.sender]);

    let claimer_usdc = get_associated_token_address(&f.claimer.pubkey(), &f.usdc_mint);
    let claim_ix = Instruction {
        program_id: chainstock::ID,
        accounts: ix_accounts::ClaimGift {
            claimer: f.claimer.pubkey(),
            payer: f.claimer.pubkey(),
            backend_authority: f.backend_authority.pubkey(),
            config: f.config_pda,
            gift: gift_pda,
            rent_receiver: f.claimer.pubkey(),
            usdc_mint: f.usdc_mint,
            vault,
            recipient_usdc: claimer_usdc,
            token_program: spl_token::ID,
            associated_token_program: spl_associated_token_account::ID,
            system_program: solana_sdk::system_program::ID,
        }
        .to_account_metas(None),
        data: ix_data::ClaimGift {}.data(),
    };
    send(&mut f.svm, &[claim_ix], &f.claimer.clone(), &[&f.claimer]);

    assert_eq!(usdc_balance(&f.svm, &claimer_usdc), amount);
    assert!(f.svm.get_account(&vault).is_none(), "vault should be closed");
    assert!(
        f.svm.get_account(&gift_pda).is_none(),
        "gift PDA should be closed"
    );
}

#[test]
fn cancel_gift_refunds_sender_and_rejects_non_sender() {
    let amount: u64 = 25_000_000;
    let mut f = setup(1_000_000_000);
    let (create_ix, gift_pda, vault) = create_gift_ix(&f, [4u8; 16], amount, None, None); // FCFS
    send(&mut f.svm, &[create_ix], &f.sender.clone(), &[&f.sender]);

    let sender_usdc = get_associated_token_address(&f.sender.pubkey(), &f.usdc_mint);
    let balance_before_cancel = usdc_balance(&f.svm, &sender_usdc);

    // Non-sender cannot cancel.
    let attacker = Keypair::new();
    f.svm.airdrop(&attacker.pubkey(), 10_000_000_000).unwrap();
    let bad_cancel_ix = Instruction {
        program_id: chainstock::ID,
        accounts: ix_accounts::CancelGift {
            sender: attacker.pubkey(),
            gift: gift_pda,
            usdc_mint: f.usdc_mint,
            vault,
            sender_usdc,
            token_program: spl_token::ID,
        }
        .to_account_metas(None),
        data: ix_data::CancelGift {}.data(),
    };
    let tx = Transaction::new_signed_with_payer(
        &[bad_cancel_ix],
        Some(&attacker.pubkey()),
        &[&attacker],
        f.svm.latest_blockhash(),
    );
    assert!(f.svm.send_transaction(tx).is_err());

    // Real sender cancels successfully.
    let cancel_ix = Instruction {
        program_id: chainstock::ID,
        accounts: ix_accounts::CancelGift {
            sender: f.sender.pubkey(),
            gift: gift_pda,
            usdc_mint: f.usdc_mint,
            vault,
            sender_usdc,
            token_program: spl_token::ID,
        }
        .to_account_metas(None),
        data: ix_data::CancelGift {}.data(),
    };
    send(&mut f.svm, &[cancel_ix], &f.sender.clone(), &[&f.sender]);

    assert_eq!(usdc_balance(&f.svm, &sender_usdc), balance_before_cancel + amount);
    assert!(f.svm.get_account(&vault).is_none());
    assert!(f.svm.get_account(&gift_pda).is_none());
}
