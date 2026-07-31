import { PrismaService } from '../../../database/services/prisma.service';
import { ProfilesService } from './profiles.service';

const ACCOUNT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

describe('ProfilesService', () => {
  let prisma: {
    profile: {
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: ProfilesService;

  beforeEach(() => {
    prisma = {
      profile: {
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new ProfilesService(prisma as unknown as PrismaService);
  });

  it('looks up the profile by the account id', async () => {
    const profile = { id: 'profile-1', username: 'johndoe' };
    prisma.profile.findUniqueOrThrow.mockResolvedValue(profile);

    await expect(service.getProfile(ACCOUNT_ID)).resolves.toBe(profile);

    const [[findArgs]] = prisma.profile.findUniqueOrThrow.mock.calls as [
      [{ where: { account_id: string } }],
    ];
    expect(findArgs.where).toEqual({ account_id: ACCOUNT_ID });
  });

  it('updates only the provided profile fields', async () => {
    prisma.profile.update.mockResolvedValue({ id: 'profile-1' });

    await service.updateProfile(ACCOUNT_ID, { username: 'newname' });

    const [[updateArgs]] = prisma.profile.update.mock.calls as [
      [{ where: { account_id: string }; data: Record<string, unknown> }],
    ];
    expect(updateArgs.where).toEqual({ account_id: ACCOUNT_ID });
    expect(updateArgs.data).toEqual({
      name: undefined,
      lastname: undefined,
      username: 'newname',
    });
  });
});
