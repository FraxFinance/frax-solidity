import { CollateralDetailsPack, GovernanceHistoryCodes } from './constants';
import Web3 from 'web3';
import SolanaWeb3 from '@solana/web3.js';
import BigNumber from 'bignumber.js';

/**
 * @module global
 */
declare global {

    // ==============================================================
    // Price and Collateral Data
    // ==============================================================
        
    export interface PriceItem {
        type?: any;
        coin?: string;
        blockNum: number;
        timestamp?: number;
        price?: number;
        supply?: number;
        circulating_supply?: number;
        market_cap?: number;
        circulating_market_cap?: number;
        decentralization_ratio?: number;
        ratio?: number;
        total_dollar_value?: number;
        fxs_burned_cumulative_sum?: number;
    }

    export interface StakingItem {
        blockNum: number;
        timestamp: number;
        token: string;
        supply: number;
        boosted_supply: number;
        lp_price: number;
        lp_token_supply: number;
        tvl: number;
        reward_value_usd: number;
        reward_duration: number;
        apy: number;
        apy_max?: number;
    }

    export interface veFXSItem {
        blockNum: number;
        timestamp: number;
        vefxs_supply: number;
        fxs_locked: number;
        fxs_locked_pct_of_circulating: number;
        fxs_locked_pct_of_total: number;
        avg_lock_time_yrs: number;
        pct_participating: number;
        yield_value_usd: number;
        apr: number;
    }

    export interface AMODataItem {
        blockNum: number;
        timestamp: number;
        investor_amo_total: number;
        curve_amo_total: number;
        stakedao_amo_total?: number;
        ohm_amo_total?: number;
        convex_amo_total?: number;
        rari_amo_total?: number;
        cream_amo_total?: number;
        scream_amo_total?: number;
        univ3_liquidity_amo_total?: number;
        curve_metapool_locker_amo_total?: number;
        aave_amo_total?: number;
        unspent_profit: number;
        daily_profit?: number;
        apy?: number;
    }

    export interface AMODataItemV2 {
        blockNum: number;
        timestamp: number;
        version?: number;
        curve: {
            convex_amo: number;
            curve_amo: number;
            curve_metapool_locker_amo: number;
            stakedao_amo: number;
            curve_accrued_profit: number;
            curve_related_total: number;
        };
        investor: {
            held_tokens: {
                [tkn_symbol: string]: number
            }
            cvx_locker: number;
            investor_amo: number;
            ohm_amo: number;
            investor_accrued_profit: number;
            investor_related_total: number;
        };
        lending: {
            aave_amo: number;
            cream_amo: number;
            rari_amo: number;
            scream_amo: number;
            spirit_ola_lending_amo: number;
            hundred_amo: number;
            lending_accrued_profit: number;
            lending_related_total: number;
        };
        liquidity: {
            arbitrum_sushiswap_amo: number;
            avalanche_axial_amo: number;
            avalanche_pangolin_amo: number;
            binance_apeswap_amo: number;
            fantom_curve_amo: number;
            fantom_spiritswap_amo: number;
            harmony_sushiswap_amo: number;
            moonriver_sushiswap_amo: number;
            polygon_sushiswap_amo: number;
            solana_saber_msig: number;
            univ3_liquidity_amo: number;
            liquidity_accrued_profit: number;
            liquidity_related_total: number;
        };
        combined: {
            accrued_profit: number;
            grand_total: number;
        };
    }

    export interface CompletePriceData {
        frax: PriceHistoryPack;
        fxs: PriceHistoryPack;
    }

    export interface CompleteGovernanceData {
        proposals: GovernanceProposal[]
        votes: GovernanceVote[];
        history: GovernanceHistory[];
    }

    export interface Web3Pack {
        arbitrum: Web3;
        aurora: Web3;
        avalanche: Web3;
        boba: Web3;
        bsc: Web3;
        ethereum: Web3;
        ethereum_backup: Web3;
        fantom: Web3;
        harmony: Web3;
        moonriver: Web3;
        optimism: Web3;
        polygon: Web3;
        solana: SolanaWeb3.Connection;
    }

    export interface BlockNumPack {
        arbitrum: number;
        aurora: number;
        avalanche: number;
        boba: number;
        bsc: number;
        ethereum: number;
        fantom: number;
        harmony: number;
        moonriver: number;
        optimism: number;
        polygon: number;
    }
    
    export type PriceFilterType = 'price' | 'supply' | 'market_cap';
    export type CollateralFilterType = 'col_ratio' | 'alg_ratio' | 'gth_ratio';

    export type CollateralCoinType = keyof typeof CollateralDetailsPack;

    export interface ChartJSDataPack {
        [key: string]: {
            labels: any[];
            data: any[];
            range?: { min: number, max: number };
        },
    }

    export interface ChartJSDataPackV2 {
        curve: {
            [key: string]: {
                labels: any[];
                data: any[];
                range?: { min: number, max: number };
            },
        };
        investor: {
            [key: string]: {
                labels: any[];
                data: any[];
                range?: { min: number, max: number };
            },
        }
        lending: {
            [key: string]: {
                labels: any[];
                data: any[];
                range?: { min: number, max: number };
            },
        }
        liquidity: {
            [key: string]: {
                labels: any[];
                data: any[];
                range?: { min: number, max: number };
            },
        }
        combined: {
            [key: string]: {
                labels: any[];
                data: any[];
                range?: { min: number, max: number };
            },
        }
    }

    export interface FakeCollateralCollection {
        [symbol: CollateralCoinType]: PriceHistoryPack;
    }

    export interface DataPack {
        frax: PriceHistoryPack;
        fxs: PriceHistoryPack;
        collateral: FakeCollateralCollection;
    }

    export interface PriceHistoryPack {
        full_items: PriceItem[];
        chartjs: ChartJSDataPack;
    }

    export interface StakingHistoryPack {
        full_items: StakingItem[];
        chartjs: ChartJSDataPack;
    }

    export interface veFXSHistoryPack {
        full_items: veFXSItem[];
        chartjs: ChartJSDataPack;
    }

    export interface AMOHistoryPack {
        full_items: AMODataItem[];
        chartjs: ChartJSDataPack;
    }

    export interface AMOHistoryPackV2 {
        full_items: AMODataItemV2[];
        chartjs: ChartJSDataPackV2;
    }

    export interface PolyAMOHistoryPackV2 {
        full_items: AMODataItemV2[];
        chartjs: ChartJSDataPackV2;
    }

    export interface AMOAllocations {
        investor_total: number;
        misc_chart_total: number;
        curve_amo_frax3crv_frax: number;
        stakedao_amo_frax: number;
        ohm_amo_frax: number;
        convex_amo_frax: number;
        curve_metapool_locker_amo_frax: number;
        curve_related_total_value: number;
        univ3_liquidity_amo_frax: number;
        lending_amos_data: LendingAMOsData;
        grand_total: number;
    }

    export interface AMOAllocationsV2 {
        curve: AMODataItemV2['curve'] & {
            // Nothing for now
        };
        investor: AMODataItemV2['investor'];
        lending: AMODataItemV2['lending'] & {
            lending_amos_data: LendingAMOsData;
        };
        liquidity: AMODataItemV2['liquidity'] & {
            // Nothing for now
        };
        combined: AMODataItemV2['combined'] & {
            // Nothing for now
        };
    }

    export interface CombinedDataPack {
        core: {
            frax: PriceItem;
            fxs: PriceItem;
            vefxs: veFXSItem;
        },
        liq_staking: {
            [pair: string]: StakingItem
        },
        protocol: {
            amo: AMODataItemV2
            collateral: CollateralTotalsAndRatios
        }
    }

    export interface CoinGeckoPoolDataItem {
        identifier: string;
        chain: string;
        platform: string;
        pair: string;
        pairLink: string;
        logo: string;
        pool_tokens: string[];
        pool_rewards: string[];
        liquidity_locked: number;
        apy: number;
        apy_max: number;
        is_deprecated: boolean;
    }

    export interface RariPoolInfo {
        name: string;
        pool_number: number;
        address: string;
        frax_allocated: number;
    }

    export interface LendingAMOsData {
        aave_minted: number;
        aave_frax_free: number;
        aave_frax_total: number;
        cream_frax_free: number;
        cream_minted: number;
        cream_frax_total: number;
        hundred_minted: number;
        hundred_frax_total: number;
        rari_frax_free: number;
        rari_minted: number;
        rari_frax_total: number;
        rari_pool_breakdown: RariPoolInfo[];
        scream_minted: number;
        scream_frax_total: number;
        spirit_ola_minted: number;
        spirit_ola_frax_total: number;
        total_frax_free: number;
        total_minted: number;
        total_frax: number;
        total_profit: number;
    }

    export interface TokenPack {
        tkn_addr: string;
        name: string;
        symbol: string;
        price_bn: BigNumber;
        price_dec: number;
        balance_bn: BigNumber;
        balance_dec: number;
        full_value_bn: BigNumber;
        full_value_dec: number;
        cr_value_bn: BigNumber;
        cr_value_dec: number;
        decimals: number;
        missing_decimals: number;
    }

    export interface TrackedAddrTokenInfo {
        tracked_addr: string;
        addr_full_val_bn: BigNumber;
        addr_full_val_dec: number;
        addr_cr_val_bn: BigNumber;
        addr_cr_val_dec: number;
        tokens: {
            [token_addr: string]: TokenPack
        };
    }

    export interface TokenTrackingChainSummary {
        chain: string;
        chain_full_value_bn: BigNumber;
        chain_full_value_dec: number;
        chain_cr_value_bn: BigNumber;
        chain_cr_value_dec: number;
        chain_profit_bn: BigNumber;
        chain_profit_dec: number;
        tracked_addresses: string[];
        tracked_tokens: string[];
        tracked_addr_info: {
            [tracked_addr: string]: TrackedAddrTokenInfo;
        };
        bridged_amounts: {
            frax: {
                full_bn: BigNumber;
                full_dec: number;
                cr_bn: BigNumber;
                cr_dec: number;
            };
            fxs: {
                amt_bn: BigNumber;
                amt_dec: number;
                usd_val_bn: BigNumber;
                usd_val_dec: number;
            };
            collat: {
                full_bn: BigNumber;
                full_dec: number;
                cr_bn: BigNumber;
                cr_dec: number;
            };
        };
    }

    export interface TokenTrackingTotalSummary {
        chains: {
            [chain: string]: TokenTrackingChainSummary;
        }
        total_full_value_bn: BigNumber;
        total_full_value_dec: number;
        total_cr_value_bn: BigNumber;
        total_cr_value_dec: number;
        total_crosschain_profit_bn: BigNumber;
        total_crosschain_profit_dec: number;
    }

    export interface LockedStakeBucketAggregate {
        _id: string,
        count: number,
        total: number
    }

    export interface LockedStakeBreakdownData {
        token: string,
        unlocked_sum: number,
        locked_sum: number,
        buckets: LockedStakeBucketAggregate[]
    }

    export interface CompleteCollateralData {
        history: PriceHistoryPack;
        pie_data: PriceHistoryPack;
    }

    export interface FakeCollateralPiePack {
        labels: string[];
        data: any[];
        backgroundColor: string[];
        hoverBackgroundColor: string[];
    }

    export interface CollateralTotalsAndRatios { 
        timestamp?: number;
        timestamp_formatted?: string;
        col_total: number; 
        col_ratio: number; 
        alg_ratio: number; 
        gth_ratio: number;
    }

    // ==============================================================
    // GOVERNANCE
    // ==============================================================

    export interface GovernanceProposal {
        id: number;
        eta: number;
        proposer: string;
        forVotes: number;
        againstVotes: number;
        startBlock: number;
        endBlock: number;
        title: string;
        description: string;
        executed: boolean;
        canceled: false;
    }

    export interface GovernanceVote {
        proposal_id: number;
        txid: string;
        voter: string;
        amount: number;
        yea: boolean; // 1 = yes / for, 0 = no / against;
        timestamp: number;
    }

    export type GovernanceHistoryStatus = keyof typeof GovernanceHistoryCodes;

    export interface GovernanceHistory {
        proposal_id: number;
        txid: string;
        status_code: typeof GovernanceHistoryCodes[GovernanceHistoryStatus];
        start_timestamp: number;
        end_timestamp: number;
    }

    export interface UniV3RequiredPosition {
        uni_token0: string;
        uni_token1: string;
        uni_required_fee: number;
        uni_tick_lower: number;
        uni_tick_upper: number;
    }

    export interface UniV3NFT {
        token_id: number;
        liquidity: number;
        dollar_value: number;
        tick_lower: number;
        tick_upper: number;
    }

    export interface GaugeSlice {
        name: string;
        gauge_index: number;
        address: string;
        gauge_weight: number;
        relative_weight_now_raw: number;
        relative_weight_now_pct: number;
        relative_weight_next_raw: number;
        relative_weight_next_pct: number;
        fxs_now: number;
        fxs_next: number;
    }

    export interface GaugeVote {
        gauge_address: string;
        gauge_name: string;
        vefxs_represented: number;
        weight: number;
        weight_pct: number;
        last_vote_timestamp: number;
    }

    export interface GaugeVoterInfo {
        address: string;
        votes: GaugeVote[];
        pct_weight_used: number;
    }

    // ==============================================================
    // STAKES & REWARDS
    // ==============================================================
    
    export interface UserStakeInfo {
        lp_token_balance: number;
        lp_token_bal_usd: number;
        combined_weight: number;
        rewards: RewardInfo[];
        rewards_total_usd_value: number;
        unlocked_total: number;
        unlocked_total_usd_value: number;
        locked_total: number;
        locked_total_usd_value: number;
        locked_stakes: LockedStake[];
    }

    export interface LockedStake {
        token_id?: number;
        kek_id?: string;
        start_timestamp: number;
        amount?: number;
        liquidity?: number;
        ending_timestamp: number;
        multiplier?: number;
        lock_multiplier?: number;
        dollar_value?: number;
        tick_lower?: number;
        tick_upper?: number;
    }

    export interface RewardInfo {
        token: string;
        chain: string;
        coingecko_slug: string;
        price: number;
        reward_balance: number;
        reward_usd_value: number;
        reward_rate: number;
    }

    export type BridgeType = 
        // Canonical / Native 
        'canonical' | 
        
        // Anyswap
        'anyFRAX' | 
        'anyFXS' | 
        
        // Avalanche Official Bridge
        'aebFRAX' |
        'aebFXS' |

        // Binance Official Bridge
        'binFRAX' | 
        'binFXS' | 

        // Harmony Official Bridge
        '1FRAX' | 
        '1FXS'  |

        // Polygon Official Bridge
        'polyFRAX' | 
        'polyFXS'  |

        // Solana Wormhole
        'solwormFRAX' | 
        'solwormFXS'  
    ;

    export interface StakeChoices { 
        [key: string] : StakeChoice 
    }

    export interface StakeChoice {
        lp_logo: string;
        slug?: string;
        label: string;
        chain: string;
        info_link?: string;
		add_liq_link?: string;
		trade_link?: string;
        farming_link: string;
        starting_block?: number;
        pool_tokens: string[];
        pair_token0_decimals?: number;
		pair_token1_decimals?: number;
        reward_tokens: string[];
        reward_token_decimals?: number[];
		staking_enabled?: boolean;
        vefxs_enabled?: boolean;
        is_gauged?: boolean;
        is_migratable_to_v3?: boolean;
        external_contract: boolean;
        has_varied_apy?: boolean;
		reward_token_coingecko_slugs?: string[];
        reward_token_bridge_types?: BridgeType[];
		version?: number;
        is_soon?: boolean;
    }

    export type StakeCoinType = keyof typeof StakeChoices;
    export interface StakeDetails {
        coin_available: number;
        coin_staked: number;
        fxs_earned: number;
        apy: number;
    }

    export interface StakePack {
        [coin: StakeCoinType]: StakeDetails
    }

    export interface MigratorUniV2ToUniV3TXPack {
        source_pair: string;
        dest_pair: string;
        staker_address: string
        withdraw_locked: string;
        staker_allow_migrator: string;
        transfer_lp: string;
    }

}

export { }; // Force this file to be a module
