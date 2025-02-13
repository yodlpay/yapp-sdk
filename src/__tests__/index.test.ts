import * as jose from 'jose';
import YappSDK from '..';
import { JWTPayload } from '../types/jwt';

const ensName = 'mytestyapp.eth';

const createJwt = async (
  privateKey: jose.KeyLike,
  {
    aud = ensName,
    sub = '0x1234567890123456789012345678901234567890',
    exp = Math.floor(Date.now() / 1000) + 1000,
    iss = 'yodl.me',
    ens = 'paul.eth',
  } = {},
) => {
  return await new jose.SignJWT({
    aud,
    sub,
    exp,
    iss,
    ens,
  } as JWTPayload)
    .setProtectedHeader({ alg: 'ES256' })
    .sign(privateKey);
};

describe('initializing SDK', () => {
  let sdk: YappSDK;
  let privateKey: jose.KeyLike;
  let publicKeyPem: string;

  beforeAll(async () => {
    const { publicKey, privateKey: pk } = await jose.generateKeyPair('ES256');
    privateKey = pk;
    publicKeyPem = await jose.exportSPKI(publicKey);
  });

  it('can initialize SDK', async () => {
    sdk = new YappSDK({
      origin: 'https://yodl.me',
      ensName: ensName,
      publicKey: publicKeyPem,
    });
  });

  it('throws error, without ensName', async () => {
    expect(new YappSDK({ ensName: 'foobar.eth' })).toBeDefined();
  });

  it('throws error, without ensName', async () => {
    // @ts-ignore
    await expect(() => new YappSDK({})).toThrow('ensName is required');
  });
  // todo test that defaults are applied.
});

describe('initialized SDK', () => {
  let sdk: YappSDK;
  let privateKey: jose.KeyLike;

  beforeAll(async () => {
    const { publicKey, privateKey: pk } = await jose.generateKeyPair('ES256');
    privateKey = pk;
    const publicKeyPem = await jose.exportSPKI(publicKey);

    sdk = new YappSDK({
      origin: 'https://yodl.me',
      ensName: ensName,
      publicKey: publicKeyPem,
    });
  });

  it('verifies valid jwt', async () => {
    const jwt = await createJwt(privateKey);
    expect(await sdk.verify(jwt)).toBeTruthy();
  });

  it('rejects jwt with wrong audience', async () => {
    const jwt = await createJwt(privateKey, { aud: 'nottestapp.me' });
    await expect(sdk.verify(jwt)).rejects.toThrow(
      `JWT issued for different yapp (nottestapp.me)`,
    );
  });

  it('rejects expired jwt', async () => {
    const jwt = await createJwt(privateKey, {
      exp: Math.floor(Date.now() / 1000) - 1000,
    });
    await expect(sdk.verify(jwt)).rejects.toThrow(
      '"exp" claim timestamp check failed',
    );
  });
});
