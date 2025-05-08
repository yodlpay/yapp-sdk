import { fetchFollowers, fetchFollowing, fetchSubname } from '@services';
import { CommunityConfiguration } from '@types';

export class CommunityManager {
  /**
   * Fetches the community information including ENS records and configuration
   * @param ens - The ENS name of the community
   * @returns The community records and parsed configuration data
   */
  public async getCommunityConfiguration(ens: string) {
    const community = await fetchSubname(ens);

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
    const { following: members } = await fetchFollowing(memberProvider);
    return members;
  }
}
