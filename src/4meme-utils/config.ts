// Environment variables matching Rust implementation
const TOKEN_MANAGER2 = process.env.TOKEN_MANAGER2 || '0x5c952063c7fc8610FFDB798152D69F0B9550762b';
const HELPER3_ADDRESS = process.env.HELPER3_ADDRESS || '0xF251F83e40a78868FcfA3FA4599Dad6494E46034';
const RPC_URL = process.env.RPC_URL || 'https://bsc-dataseed.binance.org';

export {
    TOKEN_MANAGER2 as TOKEN_MANAGER_ADDRESS,
    HELPER3_ADDRESS,
    RPC_URL
};