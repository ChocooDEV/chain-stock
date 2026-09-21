//! LiteSVM unit tests for the core create -> claim / cancel flows.
//!
//! Verified passing (all 4 tests) on the first real toolchain run. Needed
//! two categories of fixes beyond what was anticipated: (1) API-surface
//! drift (`solana_sdk::system_instruction`/`system_program` moved to the
//! separate `solana-system-interface` crate; `Keypair::clone` was removed
//! in favor of the explicit `insecure_clone`; `Pack`/`Mint::LEN` needed
//! importing from spl-token's own re-exported trait, not solana-sdk's —
//! see Cargo.toml's dev-dependencies comment), and (2) a structural
//! `Pubkey`/`Instruction` type split between `solana-sdk` and
//! `spl-token`/`spl-associated-token-account` (two incompatible crate
//! lines for the same concept, both still current in the ecosystem) —
//! handled via this file's `to_spl_pubkey`/`from_spl_pubkey`/`from_spl_ix`
//! conversion helpers.
//!
//! Run with: `cargo test -p chainstock` from `anchor/`, after `anchor build`
//! has produced `target/deploy/chainstock.so`.

use anchor_lang::{InstructionData, ToAccountMetas};
use litesvm::LiteSVM;
use solana_sdk::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{Keypair, Signer as _},
    transaction::Transaction,
};
use solana_system_interface::{instruction as system_instruction, program as system_program};
use spl_associated_token_account::{get_associated_token_address, instruction::create_associated_token_account};
use spl_token::solana_program::{
    instruction::Instruction as SplInstruction, program_pack::Pack, pubkey::Pubkey as SplPubkey,
};
use spl_token::state::Mint;

use chainstock::{accounts as ix_accounts, instruction as ix_data};

/// `spl-token`/`spl-associated-token-account` (see Cargo.toml's
/// dev-dependencies comment) resolve `Pubkey`/`Instruction` through a
/// separate, older `solana-pubkey`/`solana-instruction` line than
/// `solana-sdk` does — structurally identical (both plain 32-byte
/// newtypes / equivalent struct shapes), but distinct Rust types across
/// that crate-version boundary. Extensive attempts to unify the whole
/// dependency graph onto one line didn't reconcile (the two SPL crates'
/// own manifests pin the older line directly), so these convert at the
/// boundary via the shared byte/field representation instead.
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

    for kp in [&admin, &treasury, &backend_authority, &sender, &claimer] {
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
    send(&mut svm, &[create_mint_ix, init_mint_ix], &admin, &[&admin, &usdc_mint_kp]);

    // --- sender's USDC ATA, funded ---
    let sender_usdc = from_spl_pubkey(get_associated_token_address(
        &to_spl_pubkey(sender.pubkey()),
        &to_spl_pubkey(usdc_mint),
    ));
    let create_sender_ata_ix = from_spl_ix(create_associated_token_account(
        &to_spl_pubkey(admin.pubkey()),
        &to_spl_pubkey(sender.pubkey()),
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
            sender_initial_usdc,
        )
        .unwrap(),
    );
    send(
        &mut svm,
        &[create_sender_ata_ix, mint_to_sender_ix],
        &admin,
        &[&admin],
    );

    // --- treasury's USDC ATA (empty — receives the fee) ---
    let create_treasury_ata_ix = from_spl_ix(create_associated_token_account(
        &to_spl_pubkey(admin.pubkey()),
        &to_spl_pubkey(treasury.pubkey()),
        &to_spl_pubkey(usdc_mint),
        &spl_token::ID,
    ));
    send(&mut svm, &[create_treasury_ata_ix], &admin, &[&admin]);

    // --- initialize_config ---
    let (config_pda, _) = Pubkey::find_program_address(&[b"config"], &chainstock::ID);
    let init_config_ix = Instruction {
        program_id: chainstock::ID,
        accounts: ix_accounts::InitializeConfig {
            admin: admin.pubkey(),
            config: config_pda,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: ix_data::InitializeConfig {
            treasury: treasury.pubkey(),
            backend_authority: backend_authority.pubkey(),
            usdc_mint,
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
    let vault = from_spl_pubkey(get_associated_token_address(
        &to_spl_pubkey(gift_pda),
        &to_spl_pubkey(f.usdc_mint),
    ));
    let sender_usdc = from_spl_pubkey(get_associated_token_address(
        &to_spl_pubkey(f.sender.pubkey()),
        &to_spl_pubkey(f.usdc_mint),
    ));
    let treasury_usdc = from_spl_pubkey(get_associated_token_address(
        &to_spl_pubkey(f.treasury.pubkey()),
        &to_spl_pubkey(f.usdc_mint),
    ));

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
            token_program: from_spl_pubkey(spl_token::ID),
            associated_token_program: from_spl_pubkey(spl_associated_token_account::ID),
            system_program: system_program::ID,
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
    send(&mut f.svm, &[ix], &f.sender.insecure_clone(), &[&f.sender]);

    let sender_usdc = from_spl_pubkey(get_associated_token_address(
        &to_spl_pubkey(f.sender.pubkey()),
        &to_spl_pubkey(f.usdc_mint),
    ));
    let treasury_usdc = from_spl_pubkey(get_associated_token_address(
        &to_spl_pubkey(f.treasury.pubkey()),
        &to_spl_pubkey(f.usdc_mint),
    ));
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
    send(&mut f.svm, &[create_ix], &f.sender.insecure_clone(), &[&f.sender]);

    // A third party (not gift.recipient_wallet) tries to claim.
    let attacker = Keypair::new();
    f.svm.airdrop(&attacker.pubkey(), 10_000_000_000).unwrap();

    let attacker_usdc = from_spl_pubkey(get_associated_token_address(
        &to_spl_pubkey(attacker.pubkey()),
        &to_spl_pubkey(f.usdc_mint),
    ));
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
            token_program: from_spl_pubkey(spl_token::ID),
            associated_token_program: from_spl_pubkey(spl_associated_token_account::ID),
            system_program: system_program::ID,
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
    send(&mut f.svm, &[create_ix], &f.sender.insecure_clone(), &[&f.sender]);

    let claimer_usdc = from_spl_pubkey(get_associated_token_address(
        &to_spl_pubkey(f.claimer.pubkey()),
        &to_spl_pubkey(f.usdc_mint),
    ));
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
            token_program: from_spl_pubkey(spl_token::ID),
            associated_token_program: from_spl_pubkey(spl_associated_token_account::ID),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: ix_data::ClaimGift {}.data(),
    };
    send(&mut f.svm, &[claim_ix], &f.claimer.insecure_clone(), &[&f.claimer]);

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
    send(&mut f.svm, &[create_ix], &f.sender.insecure_clone(), &[&f.sender]);

    let sender_usdc = from_spl_pubkey(get_associated_token_address(
        &to_spl_pubkey(f.sender.pubkey()),
        &to_spl_pubkey(f.usdc_mint),
    ));
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
            token_program: from_spl_pubkey(spl_token::ID),
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
            token_program: from_spl_pubkey(spl_token::ID),
        }
        .to_account_metas(None),
        data: ix_data::CancelGift {}.data(),
    };
    send(&mut f.svm, &[cancel_ix], &f.sender.insecure_clone(), &[&f.sender]);

    assert_eq!(usdc_balance(&f.svm, &sender_usdc), balance_before_cancel + amount);
    assert!(f.svm.get_account(&vault).is_none());
    assert!(f.svm.get_account(&gift_pda).is_none());
}

/// Directly transfers extra tokens into `to` from the fixture's mint,
/// simulating a third party "donating" tokens to a gift's vault — no
/// instruction in this program controls or expects this. Used to test the
/// donation-griefing fix (see claim_gift.rs's handler doc comment).
fn donate(f: &mut Fixture, to: &Pubkey, amount: u64) {
    let ix = from_spl_ix(
        spl_token::instruction::mint_to(
            &spl_token::ID,
            &to_spl_pubkey(f.usdc_mint),
            &to_spl_pubkey(*to),
            &to_spl_pubkey(f.admin.pubkey()),
            &[],
            amount,
        )
        .unwrap(),
    );
    send(&mut f.svm, &[ix], &f.admin.insecure_clone(), &[&f.admin]);
}

#[test]
fn create_gift_rejects_a_mint_other_than_configs_usdc_mint() {
    let mut f = setup(1_000_000_000);

    // A second, entirely different mint — not the one `initialize_config`
    // registered as `config.usdc_mint`. See docs/SecurityAudit.md finding
    // #3: without this on-chain check, `create_gift` was mint-agnostic.
    let wrong_mint_kp = Keypair::new();
    let wrong_mint = wrong_mint_kp.pubkey();
    let rent = f.svm.minimum_balance_for_rent_exemption(Mint::LEN);
    let create_mint_ix = system_instruction::create_account(
        &f.admin.pubkey(),
        &wrong_mint,
        rent,
        Mint::LEN as u64,
        &from_spl_pubkey(spl_token::ID),
    );
    let init_mint_ix = from_spl_ix(
        spl_token::instruction::initialize_mint2(
            &spl_token::ID,
            &to_spl_pubkey(wrong_mint),
            &to_spl_pubkey(f.admin.pubkey()),
            None,
            USDC_DECIMALS,
        )
        .unwrap(),
    );
    send(&mut f.svm, &[create_mint_ix, init_mint_ix], &f.admin.insecure_clone(), &[&f.admin, &wrong_mint_kp]);

    let claim_seed = [13u8; 16];
    let (gift_pda, _) = Pubkey::find_program_address(&[b"gift", &claim_seed], &chainstock::ID);
    let vault = from_spl_pubkey(get_associated_token_address(&to_spl_pubkey(gift_pda), &to_spl_pubkey(wrong_mint)));
    let sender_usdc = from_spl_pubkey(get_associated_token_address(
        &to_spl_pubkey(f.sender.pubkey()),
        &to_spl_pubkey(wrong_mint),
    ));
    let treasury_usdc = from_spl_pubkey(get_associated_token_address(
        &to_spl_pubkey(f.treasury.pubkey()),
        &to_spl_pubkey(wrong_mint),
    ));
    let bad_ix = Instruction {
        program_id: chainstock::ID,
        accounts: ix_accounts::CreateGift {
            sender: f.sender.pubkey(),
            config: f.config_pda,
            gift: gift_pda,
            usdc_mint: wrong_mint,
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
            amount_usdc: 25_000_000,
            stock_mint: Pubkey::new_unique(),
            recipient_mode: chainstock::state::RecipientMode::Fcfs,
            recipient_wallet: None,
            recipient_email_hash: None,
        }
        .data(),
    };
    let tx = Transaction::new_signed_with_payer(
        &[bad_ix],
        Some(&f.sender.pubkey()),
        &[&f.sender],
        f.svm.latest_blockhash(),
    );
    assert!(
        f.svm.send_transaction(tx).is_err(),
        "create_gift with a mint other than config.usdc_mint must be rejected"
    );
}

#[test]
fn claim_gift_dedicated_by_email_requires_backend_cosignature() {
    let amount: u64 = 25_000_000;
    let mut f = setup(1_000_000_000);
    let email_hash = [7u8; 32];
    let (create_ix, gift_pda, vault) =
        create_gift_ix(&f, [5u8; 16], amount, None, Some(email_hash));
    send(&mut f.svm, &[create_ix], &f.sender.insecure_clone(), &[&f.sender]);

    // A fresh wallet — in the sponsored path below it never needs a
    // balance (the "wallet-less claiming" scenario, backend pays), but
    // the self-funded negative-case attempt just above it needs to pay
    // its own way, hence the airdrop a few lines down.
    let claimer = Keypair::new();
    let claimer_usdc = from_spl_pubkey(get_associated_token_address(
        &to_spl_pubkey(claimer.pubkey()),
        &to_spl_pubkey(f.usdc_mint),
    ));

    // Without the backend's co-signature, this must fail on-chain — the
    // program has no way to verify the email match itself, so it's the
    // only gate. `payer` is a `Signer`-typed field and is always required
    // regardless of mode, so to isolate the backend_authority check
    // specifically this attempt is self-funded (claimer pays their own
    // way) rather than sponsored — backend_authority is still passed as
    // the account (so identity matches `config.backend_authority`), it
    // just genuinely doesn't sign.
    f.svm.airdrop(&claimer.pubkey(), 10_000_000_000).unwrap();
    let unsigned_claim_ix = Instruction {
        program_id: chainstock::ID,
        accounts: ix_accounts::ClaimGift {
            claimer: claimer.pubkey(),
            payer: claimer.pubkey(),
            backend_authority: f.backend_authority.pubkey(),
            config: f.config_pda,
            gift: gift_pda,
            rent_receiver: claimer.pubkey(),
            usdc_mint: f.usdc_mint,
            vault,
            recipient_usdc: claimer_usdc,
            token_program: from_spl_pubkey(spl_token::ID),
            associated_token_program: from_spl_pubkey(spl_associated_token_account::ID),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: ix_data::ClaimGift {}.data(),
    };
    let tx = Transaction::new_signed_with_payer(
        &[unsigned_claim_ix],
        Some(&claimer.pubkey()),
        &[&claimer], // backend_authority does NOT sign
        f.svm.latest_blockhash(),
    );
    assert!(
        f.svm.send_transaction(tx).is_err(),
        "dedicated-by-email claim without the backend's signature must fail"
    );

    // With it, it succeeds — backend_authority both sponsors (pays) and
    // co-signs, claimer signs too (it's their funds landing). This is the
    // "wallet-less claiming" / no-SOL sponsored scenario.
    let claim_ix = Instruction {
        program_id: chainstock::ID,
        accounts: ix_accounts::ClaimGift {
            claimer: claimer.pubkey(),
            payer: f.backend_authority.pubkey(),
            backend_authority: f.backend_authority.pubkey(),
            config: f.config_pda,
            gift: gift_pda,
            rent_receiver: f.backend_authority.pubkey(),
            usdc_mint: f.usdc_mint,
            vault,
            recipient_usdc: claimer_usdc,
            token_program: from_spl_pubkey(spl_token::ID),
            associated_token_program: from_spl_pubkey(spl_associated_token_account::ID),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: ix_data::ClaimGift {}.data(),
    };
    send(
        &mut f.svm,
        &[claim_ix],
        &f.backend_authority.insecure_clone(),
        &[&claimer, &f.backend_authority],
    );

    assert_eq!(usdc_balance(&f.svm, &claimer_usdc), amount);
    assert!(f.svm.get_account(&vault).is_none());
    assert!(f.svm.get_account(&gift_pda).is_none());
}

#[test]
fn fcfs_second_claim_against_closed_vault_is_rejected() {
    let amount: u64 = 25_000_000;
    let mut f = setup(1_000_000_000);
    let (create_ix, gift_pda, vault) = create_gift_ix(&f, [6u8; 16], amount, None, None); // FCFS
    send(&mut f.svm, &[create_ix], &f.sender.insecure_clone(), &[&f.sender]);

    let first_claimer = Keypair::new();
    f.svm.airdrop(&first_claimer.pubkey(), 10_000_000_000).unwrap();
    let first_claimer_usdc = from_spl_pubkey(get_associated_token_address(
        &to_spl_pubkey(first_claimer.pubkey()),
        &to_spl_pubkey(f.usdc_mint),
    ));
    let first_claim_ix = Instruction {
        program_id: chainstock::ID,
        accounts: ix_accounts::ClaimGift {
            claimer: first_claimer.pubkey(),
            payer: first_claimer.pubkey(),
            backend_authority: f.backend_authority.pubkey(),
            config: f.config_pda,
            gift: gift_pda,
            rent_receiver: first_claimer.pubkey(),
            usdc_mint: f.usdc_mint,
            vault,
            recipient_usdc: first_claimer_usdc,
            token_program: from_spl_pubkey(spl_token::ID),
            associated_token_program: from_spl_pubkey(spl_associated_token_account::ID),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: ix_data::ClaimGift {}.data(),
    };
    send(&mut f.svm, &[first_claim_ix], &first_claimer.insecure_clone(), &[&first_claimer]);
    assert_eq!(usdc_balance(&f.svm, &first_claimer_usdc), amount);
    assert!(f.svm.get_account(&gift_pda).is_none(), "gift PDA should be closed after the first claim");

    // A second party races to claim the same (now-closed) gift.
    let second_claimer = Keypair::new();
    f.svm.airdrop(&second_claimer.pubkey(), 10_000_000_000).unwrap();
    let second_claimer_usdc = from_spl_pubkey(get_associated_token_address(
        &to_spl_pubkey(second_claimer.pubkey()),
        &to_spl_pubkey(f.usdc_mint),
    ));
    let second_claim_ix = Instruction {
        program_id: chainstock::ID,
        accounts: ix_accounts::ClaimGift {
            claimer: second_claimer.pubkey(),
            payer: second_claimer.pubkey(),
            backend_authority: f.backend_authority.pubkey(),
            config: f.config_pda,
            gift: gift_pda,
            rent_receiver: second_claimer.pubkey(),
            usdc_mint: f.usdc_mint,
            vault,
            recipient_usdc: second_claimer_usdc,
            token_program: from_spl_pubkey(spl_token::ID),
            associated_token_program: from_spl_pubkey(spl_associated_token_account::ID),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: ix_data::ClaimGift {}.data(),
    };
    let tx = Transaction::new_signed_with_payer(
        &[second_claim_ix],
        Some(&second_claimer.pubkey()),
        &[&second_claimer],
        f.svm.latest_blockhash(),
    );
    assert!(
        f.svm.send_transaction(tx).is_err(),
        "second claim against an already-closed FCFS vault must fail"
    );
}

#[test]
fn fee_floor_applies_below_threshold_and_bps_applies_above_it() {
    let mut f = setup(1_000_000_000);

    // $1 gift: 250bps of $1 is $0.025 (25_000), well under the $0.15
    // (150_000) floor — the floor must win.
    let small_amount: u64 = 1_000_000;
    let (small_ix, _small_gift, _small_vault) =
        create_gift_ix(&f, [8u8; 16], small_amount, None, None);
    send(&mut f.svm, &[small_ix], &f.sender.insecure_clone(), &[&f.sender]);
    let treasury_usdc = from_spl_pubkey(get_associated_token_address(
        &to_spl_pubkey(f.treasury.pubkey()),
        &to_spl_pubkey(f.usdc_mint),
    ));
    assert_eq!(
        usdc_balance(&f.svm, &treasury_usdc),
        FEE_MIN_USDC,
        "below the bps/floor crossover, the flat floor must apply"
    );

    // $100 gift: 250bps of $100 is $2.50 (2_500_000), comfortably above the
    // floor — the bps-calculated fee must win.
    let large_amount: u64 = 100_000_000;
    let (large_ix, _large_gift, _large_vault) =
        create_gift_ix(&f, [9u8; 16], large_amount, None, None);
    send(&mut f.svm, &[large_ix], &f.sender.insecure_clone(), &[&f.sender]);
    let expected_large_fee = (large_amount as u128 * FEE_BPS as u128 / 10_000) as u64;
    assert!(expected_large_fee > FEE_MIN_USDC, "test setup should exercise the bps-dominant case");
    assert_eq!(
        usdc_balance(&f.svm, &treasury_usdc),
        FEE_MIN_USDC + expected_large_fee,
        "above the crossover, the bps-calculated fee must apply (added to the floor fee already collected)"
    );
}

#[test]
fn update_config_persists_and_is_admin_gated() {
    let mut f = setup(1_000_000_000);

    // Non-admin cannot update.
    let attacker = Keypair::new();
    f.svm.airdrop(&attacker.pubkey(), 10_000_000_000).unwrap();
    let bad_update_ix = Instruction {
        program_id: chainstock::ID,
        accounts: ix_accounts::UpdateConfig {
            config: f.config_pda,
            admin: attacker.pubkey(),
        }
        .to_account_metas(None),
        data: ix_data::UpdateConfig {
            fee_bps: Some(500),
            fee_min_usdc: None,
            treasury: None,
            backend_authority: None,
            usdc_mint: None,
        }
        .data(),
    };
    let tx = Transaction::new_signed_with_payer(
        &[bad_update_ix],
        Some(&attacker.pubkey()),
        &[&attacker],
        f.svm.latest_blockhash(),
    );
    assert!(f.svm.send_transaction(tx).is_err(), "non-admin update_config must fail");

    // Admin updates fee_bps — regression check for the missing `mut` bug
    // (see update_config.rs): without it, this instruction would succeed
    // but silently write nothing, so the fee actually charged by a
    // subsequent create_gift would stay at the original 250bps instead of
    // reflecting the new value.
    let new_fee_bps: u16 = 500;
    let update_ix = Instruction {
        program_id: chainstock::ID,
        accounts: ix_accounts::UpdateConfig {
            config: f.config_pda,
            admin: f.admin.pubkey(),
        }
        .to_account_metas(None),
        data: ix_data::UpdateConfig {
            fee_bps: Some(new_fee_bps),
            fee_min_usdc: None,
            treasury: None,
            backend_authority: None,
            usdc_mint: None,
        }
        .data(),
    };
    send(&mut f.svm, &[update_ix], &f.admin.insecure_clone(), &[&f.admin]);

    let amount: u64 = 100_000_000; // comfortably above the fee floor
    let (create_ix, _gift_pda, _vault) = create_gift_ix(&f, [10u8; 16], amount, None, None);
    send(&mut f.svm, &[create_ix], &f.sender.insecure_clone(), &[&f.sender]);

    let treasury_usdc = from_spl_pubkey(get_associated_token_address(
        &to_spl_pubkey(f.treasury.pubkey()),
        &to_spl_pubkey(f.usdc_mint),
    ));
    let expected_fee_at_new_rate = (amount as u128 * new_fee_bps as u128 / 10_000) as u64;
    assert_eq!(
        usdc_balance(&f.svm, &treasury_usdc),
        expected_fee_at_new_rate,
        "create_gift's fee must reflect update_config's new fee_bps, proving the write actually persisted"
    );
}

#[test]
fn claim_gift_survives_a_donation_griefing_attempt() {
    let amount: u64 = 25_000_000;
    let mut f = setup(1_000_000_000);
    let (create_ix, gift_pda, vault) = create_gift_ix(&f, [11u8; 16], amount, None, None); // FCFS
    send(&mut f.svm, &[create_ix], &f.sender.insecure_clone(), &[&f.sender]);

    // A third party (no relation to this gift) donates extra tokens
    // straight into the vault's publicly derivable ATA before it's
    // claimed — see claim_gift.rs's handler doc comment for why this used
    // to permanently brick the gift.
    let donation: u64 = 1_000;
    donate(&mut f, &vault, donation);
    assert_eq!(usdc_balance(&f.svm, &vault), amount + donation);

    let claimer = Keypair::new();
    f.svm.airdrop(&claimer.pubkey(), 10_000_000_000).unwrap();
    let claimer_usdc = from_spl_pubkey(get_associated_token_address(
        &to_spl_pubkey(claimer.pubkey()),
        &to_spl_pubkey(f.usdc_mint),
    ));
    let claim_ix = Instruction {
        program_id: chainstock::ID,
        accounts: ix_accounts::ClaimGift {
            claimer: claimer.pubkey(),
            payer: claimer.pubkey(),
            backend_authority: f.backend_authority.pubkey(),
            config: f.config_pda,
            gift: gift_pda,
            rent_receiver: claimer.pubkey(),
            usdc_mint: f.usdc_mint,
            vault,
            recipient_usdc: claimer_usdc,
            token_program: from_spl_pubkey(spl_token::ID),
            associated_token_program: from_spl_pubkey(spl_associated_token_account::ID),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: ix_data::ClaimGift {}.data(),
    };
    send(&mut f.svm, &[claim_ix], &claimer.insecure_clone(), &[&claimer]);

    assert_eq!(
        usdc_balance(&f.svm, &claimer_usdc),
        amount + donation,
        "the donated excess should land with the recipient, not brick the claim"
    );
    assert!(f.svm.get_account(&vault).is_none(), "vault should still close despite the donation");
    assert!(f.svm.get_account(&gift_pda).is_none());
}

#[test]
fn cancel_gift_survives_a_donation_griefing_attempt() {
    let amount: u64 = 25_000_000;
    let mut f = setup(1_000_000_000);
    let (create_ix, gift_pda, vault) = create_gift_ix(&f, [12u8; 16], amount, None, None);
    send(&mut f.svm, &[create_ix], &f.sender.insecure_clone(), &[&f.sender]);

    let donation: u64 = 2_500;
    donate(&mut f, &vault, donation);

    let sender_usdc = from_spl_pubkey(get_associated_token_address(
        &to_spl_pubkey(f.sender.pubkey()),
        &to_spl_pubkey(f.usdc_mint),
    ));
    let balance_before_cancel = usdc_balance(&f.svm, &sender_usdc);

    let cancel_ix = Instruction {
        program_id: chainstock::ID,
        accounts: ix_accounts::CancelGift {
            sender: f.sender.pubkey(),
            gift: gift_pda,
            usdc_mint: f.usdc_mint,
            vault,
            sender_usdc,
            token_program: from_spl_pubkey(spl_token::ID),
        }
        .to_account_metas(None),
        data: ix_data::CancelGift {}.data(),
    };
    send(&mut f.svm, &[cancel_ix], &f.sender.insecure_clone(), &[&f.sender]);

    assert_eq!(
        usdc_balance(&f.svm, &sender_usdc),
        balance_before_cancel + amount + donation,
        "the donated excess should land back with the sender, not brick the cancel"
    );
    assert!(f.svm.get_account(&vault).is_none(), "vault should still close despite the donation");
    assert!(f.svm.get_account(&gift_pda).is_none());
}
