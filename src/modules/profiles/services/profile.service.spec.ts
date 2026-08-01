import { PrismaService } from '../../../database/services/prisma.service';
import { ProfileService } from './profile.service';

const ACCOUNT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

describe('ProfilesService', () => {
  let prisma: {
    profile: {
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: ProfileService;

  beforeEach(() => {
    prisma = {
      profile: {
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new ProfileService(prisma as unknown as PrismaService);
  });

  it('looks up the profile by the account id', async () => {
    const profile = { id: 'profile-1', username: 'johndoe' };
    prisma.profile.findUniqueOrThrow.mockResolvedValue(profile);

    await expect(service.getProfile(ACCOUNT_ID)).resolves.toBe(profile);

    const [[findArgs]] = prisma.profile.findUniqueOrThrow.mock.calls as [
      [{ where: { accountId: string } }],
    ];
    expect(findArgs.where).toEqual({ accountId: ACCOUNT_ID });
  });

  it('resolves the profile id for an account', async () => {
    prisma.profile.findUniqueOrThrow.mockResolvedValue({ id: 'profile-1' });

    await expect(service.requireProfileId(ACCOUNT_ID)).resolves.toBe(
      'profile-1',
    );
  });

  it('updates only the provided profile fields', async () => {
    prisma.profile.update.mockResolvedValue({ id: 'profile-1' });

    await service.updateProfile(ACCOUNT_ID, { username: 'newname' });

    const [[updateArgs]] = prisma.profile.update.mock.calls as [
      [{ where: { accountId: string }; data: Record<string, unknown> }],
    ];
    expect(updateArgs.where).toEqual({ accountId: ACCOUNT_ID });
    expect(updateArgs.data).toEqual({
      name: undefined,
      lastname: undefined,
      username: 'newname',
      phone: undefined,
      avatar: undefined,
    });
  });
});
