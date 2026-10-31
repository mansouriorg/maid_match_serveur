import { Test, TestingModule } from '@nestjs/testing';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

// The real SettingsService needs the database. A small fake is enough here.
jest.mock('./settings.service', () => ({
  SettingsService: class SettingsService {},
}));

describe('SettingsController', () => {
  let controller: SettingsController;

  const fullSettings = {
    id: 1,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    companyName: 'Example Co',
    contactPhone: '0102030405',
    defaultHourlyRate: 22,
    emailAlerts: true,
    smsAlerts: false,
    updatedAt: new Date(0),
  };

  const serviceFake = {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    serviceFake.getSettings.mockResolvedValue(fullSettings);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [{ provide: SettingsService, useValue: serviceFake }],
    }).compile();

    controller = module.get<SettingsController>(SettingsController);
  });

  it('gives a visitor only the hourly rate', async () => {
    await expect(controller.getSettings({})).resolves.toEqual({
      defaultHourlyRate: 22,
    });
  });

  it('gives a logged-in admin the full settings', async () => {
    await expect(
      controller.getSettings({ user: { userId: 1 } }),
    ).resolves.toEqual(fullSettings);
  });
});
