import { JustaName } from '@justaname.id/sdk';
import { fetchFollowers, fetchFollowing } from '@services';
import { CommunityConfiguration, YappSDKConfig } from '@types';
import { justaname } from '@utils';

export class CommunityManager {
  private justaname: JustaName;

  constructor(config: YappSDKConfig) {
    this.justaname = justaname(config.mainnetRpcUrl);
  }

  /**
   * Fetches the community information including ENS records and configuration
   * @param ens - The ENS name of the community
   * @returns The community records and parsed configuration data
   */
  public async getCommunityConfiguration(ens: string) {
    const community = await this.justaname.subnames.getRecords({
      ens,
    });

    if (!community.ens) {
      throw new Error(`[CommunityManager] Community not found: ${ens}`);
    }

    const yodlCommunityConfig = community.records.texts.find(
      (record) => record.key === 'me.yodl.community',
    );

    if (!yodlCommunityConfig) {
      throw new Error(`[CommunityManager] Community config not found: ${ens}`);
    }

    // TODO: Validate the community config with zod
    const communityConfig = JSON.parse(
      yodlCommunityConfig.value,
    ) as CommunityConfiguration;

    return {
      ...community,
      config: communityConfig,
    };
  }

  /**
   * Fetches the followers of a community
   * @param ens - The ENS name of the community
   * @returns The followers of the community
   */
  public async getCommunityFollowers(ens: string) {
    const { followers } = await fetchFollowers(ens);
    return followers;
  }

  /**
   * Fetches the members of a community
   * @param memberProvider - The address or ENS name of the account that follows community members
   * @returns The accounts that the memberProvider is following, representing the community members
   */
  public async getCommunityMembers(memberProvider: string) {
    const { following } = await fetchFollowing(memberProvider);
    return following;
  }
}
