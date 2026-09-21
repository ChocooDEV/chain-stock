/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/chainstock.json`.
 */
export type Chainstock = {
  "address": "3ubCASxd8ci746bJRNkdLZQvAzyS8kngFQ6smE3XohV5",
  "metadata": {
    "name": "chainstock",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "ChainStock escrow/claim program — see docs/Architecture.md"
  },
  "docs": [
    "ChainStock's escrow/claim program — see docs/Architecture.md for the",
    "full design rationale. Source of truth for money is always on-chain,",
    "never the off-chain index (docs/App.md): every gift's escrowed USDC",
    "lives in a real Solana account until `claim_gift` or `cancel_gift`",
    "moves it, and both instructions always fully close the `Gift` PDA and",
    "its vault — no permanently-alive accounts, no database-editable",
    "balance."
  ],
  "instructions": [
    {
      "name": "cancelGift",
      "discriminator": [
        1,
        35,
        202,
        245,
        89,
        105,
        95,
        135
      ],
      "accounts": [
        {
          "name": "sender",
          "writable": true,
          "signer": true,
          "relations": [
            "gift"
          ]
        },
        {
          "name": "gift",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  105,
                  102,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "gift.claimSeed",
                "account": "gift"
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "gift"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "senderUsdc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "sender"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "claimGift",
      "discriminator": [
        100,
        71,
        251,
        14,
        225,
        15,
        243,
        196
      ],
      "accounts": [
        {
          "name": "claimer",
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "backendAuthority",
          "docs": [
            "handler; only required to have actually signed for",
            "dedicated-by-email claims (checked there too)."
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "gift",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  105,
                  102,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "gift.claimSeed",
                "account": "gift"
              }
            ]
          }
        },
        {
          "name": "rentReceiver",
          "docs": [
            "destination\" rule (whoever paid the tx fee receives it). No",
            "exploit if a client points this elsewhere; worst case is a wrong",
            "party keeping ~0.002 SOL of rent, not a fund-safety issue."
          ],
          "writable": true
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "gift"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "recipientUsdc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "claimer"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "closeConfig",
      "discriminator": [
        145,
        9,
        72,
        157,
        95,
        125,
        61,
        85
      ],
      "accounts": [
        {
          "name": "config",
          "docs": [
            "in the handler (see its comment for why this isn't a typed",
            "`Account<'info, Config>`). `admin` is read directly from a fixed",
            "byte offset that's valid across any `Config` layout version, since",
            "it's always the first field immediately after the 8-byte",
            "discriminator, regardless of what's been added after it."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "createGift",
      "discriminator": [
        72,
        252,
        112,
        45,
        15,
        71,
        104,
        225
      ],
      "accounts": [
        {
          "name": "sender",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "gift",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  105,
                  102,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "claimSeed"
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "senderUsdc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "sender"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "vault",
          "docs": [
            "The escrow vault — a fresh USDC token account owned by the `Gift`",
            "PDA itself, so only this program (via a PDA signer) can ever move",
            "funds out of it."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "gift"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "treasuryUsdc",
          "docs": [
            "The platform fee's destination. Not `init` here — provisioning the",
            "treasury's own USDC account is a one-time ops step, not something",
            "every sender should incidentally pay rent for."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "config.treasury",
                "account": "config"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "claimSeed",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        },
        {
          "name": "amountUsdc",
          "type": "u64"
        },
        {
          "name": "stockMint",
          "type": "pubkey"
        },
        {
          "name": "recipientMode",
          "type": {
            "defined": {
              "name": "recipientMode"
            }
          }
        },
        {
          "name": "recipientWallet",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "recipientEmailHash",
          "type": {
            "option": {
              "array": [
                "u8",
                32
              ]
            }
          }
        }
      ]
    },
    {
      "name": "initializeConfig",
      "discriminator": [
        208,
        127,
        21,
        1,
        194,
        190,
        196,
        70
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "treasury",
          "type": "pubkey"
        },
        {
          "name": "backendAuthority",
          "type": "pubkey"
        },
        {
          "name": "usdcMint",
          "type": "pubkey"
        },
        {
          "name": "feeBps",
          "type": "u16"
        },
        {
          "name": "feeMinUsdc",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateConfig",
      "discriminator": [
        29,
        158,
        252,
        191,
        10,
        83,
        219,
        99
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "feeBps",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "feeMinUsdc",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "treasury",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "backendAuthority",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "usdcMint",
          "type": {
            "option": "pubkey"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "gift",
      "discriminator": [
        228,
        29,
        11,
        4,
        86,
        244,
        244,
        33
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Signer is not the config admin"
    },
    {
      "code": 6001,
      "name": "feeTooHigh",
      "msg": "fee_bps exceeds the hard-coded maximum"
    },
    {
      "code": 6002,
      "name": "zeroAmount",
      "msg": "amount_usdc must be greater than zero"
    },
    {
      "code": 6003,
      "name": "invalidDedicatedRecipient",
      "msg": "Dedicated gift must set exactly one of recipient_wallet / recipient_email_hash"
    },
    {
      "code": 6004,
      "name": "unexpectedFcfsRecipient",
      "msg": "FCFS gift must not set recipient_wallet or recipient_email_hash"
    },
    {
      "code": 6005,
      "name": "giftNotPending",
      "msg": "Gift is not in Pending status"
    },
    {
      "code": 6006,
      "name": "unauthorizedClaimer",
      "msg": "Signer is not the recipient this gift is dedicated to"
    },
    {
      "code": 6007,
      "name": "missingBackendAttestation",
      "msg": "Dedicated-by-email claims require the backend authority's co-signature"
    },
    {
      "code": 6008,
      "name": "unauthorizedCanceler",
      "msg": "Signer is not the gift's original sender"
    },
    {
      "code": 6009,
      "name": "overflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6010,
      "name": "wrongUsdcMint",
      "msg": "usdc_mint does not match config.usdc_mint"
    }
  ],
  "types": [
    {
      "name": "config",
      "docs": [
        "Platform fee parameters, singleton PDA (seeds: `[\"config\"]`) — tunable",
        "without a redeploy, and the take rate is publicly auditable on-chain",
        "rather than living in a backend. See docs/Architecture.md."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "docs": [
              "The only signer allowed to call `update_config`."
            ],
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "docs": [
              "Where the platform fee portion of every `create_gift` goes."
            ],
            "type": "pubkey"
          },
          {
            "name": "backendAuthority",
            "docs": [
              "The backend's signing key. Required co-signer on every",
              "dedicated-by-email claim (proves the backend already checked the",
              "claimer's Privy-verified email off-chain — see docs/App.md's",
              "\"Wallet-less claiming\" section) and the account that receives rent",
              "refunds / reimbursement on sponsored (no-SOL) claims. Not present",
              "in the original Architecture.md field list — added here because",
              "the program has no other way to recognize \"the trusted backend\"",
              "on-chain; docs/Architecture.md should be updated to match."
            ],
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "docs": [
              "The only mint `create_gift` will accept as the escrow currency.",
              "Without this, the program was mint-agnostic — anyone could escrow",
              "an arbitrary (fake, or Token-2022-with-a-permanent-delegate) token",
              "while it still looked like an ordinary gift in the app. See",
              "docs/SecurityAudit.md finding #3. Admin-settable (like `treasury`)",
              "rather than hardcoded, since the address differs per cluster",
              "(devnet test mints vs. mainnet's real USDC) and this same pattern",
              "already exists for every other operational parameter here."
            ],
            "type": "pubkey"
          },
          {
            "name": "feeBps",
            "docs": [
              "Basis points, e.g. 250 = 2.5%. Hard-capped at `MAX_FEE_BPS` inside",
              "`update_config` and `initialize_config` — even a compromised admin",
              "key can't set an arbitrary fee."
            ],
            "type": "u16"
          },
          {
            "name": "feeMinUsdc",
            "docs": [
              "Minimum fee in USDC base units (6 decimals), e.g. 150_000 = $0.15."
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "gift",
      "docs": [
        "One gift's escrow record, PDA (seeds: `[\"gift\", claim_seed]`) — see",
        "docs/Architecture.md's \"Gift account\" section. The vault (a USDC token",
        "account owned by this PDA) is created alongside it at `create_gift` and",
        "always fully closed by whichever instruction settles the gift",
        "(`claim_gift` or `cancel_gift`) — no permanently-alive accounts."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "stockMint",
            "docs": [
              "Target tokenized-stock mint — informational only for the program",
              "(the actual USDC -> stock swap happens outside this program, see",
              "\"Composing the swap\" in Architecture.md); stored so an indexer",
              "doesn't have to separately track which mint a gift is denominated",
              "against."
            ],
            "type": "pubkey"
          },
          {
            "name": "amountUsdc",
            "docs": [
              "Escrowed face value. The recipient always receives exactly this",
              "amount — the platform fee is charged on top at `create_gift`, not",
              "carved out of this figure."
            ],
            "type": "u64"
          },
          {
            "name": "recipientMode",
            "type": {
              "defined": {
                "name": "recipientMode"
              }
            }
          },
          {
            "name": "recipientWallet",
            "docs": [
              "Set for dedicated-by-wallet gifts (`recipient_mode == Dedicated`)."
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "recipientEmailHash",
            "docs": [
              "Set for dedicated-by-email gifts (`recipient_mode == Dedicated`).",
              "A commitment (e.g. `sha256(lowercased email)`), not the raw email",
              "address — email identity itself is verified off-chain by Privy at",
              "claim time (see docs/Architecture.md), this hash only lets the",
              "backend prove *which* gift a given verified email is allowed to",
              "claim without putting the plaintext address on-chain."
            ],
            "type": {
              "option": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "giftStatus"
              }
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "claimSeed",
            "docs": [
              "Random, client-generated at `create_gift` — the claim link encodes",
              "this directly. Random (not a derivable sender+nonce seed)",
              "specifically so a claim link can't be enumerated by scanning",
              "possible PDAs."
            ],
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "giftStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "claimed"
          },
          {
            "name": "canceled"
          }
        ]
      }
    },
    {
      "name": "recipientMode",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "dedicated"
          },
          {
            "name": "fcfs"
          }
        ]
      }
    }
  ]
};
