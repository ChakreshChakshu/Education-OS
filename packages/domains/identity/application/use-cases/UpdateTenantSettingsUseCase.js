const { Result } = require('../../core');

class UpdateTenantSettingsUseCase {
  constructor({ tenantRepository }) {
    this.tenantRepository = tenantRepository;
  }

  async execute({ tenantId, name, settingsJson }) {
    if (!tenantId) {
      return Result.fail('Tenant ID is required.');
    }

    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      return Result.fail('Tenant not found.');
    }

    if (name) {
      const renameResult = tenant.rename(name);
      if (renameResult.isFailure) {
        return Result.fail(renameResult.error);
      }
    }

    if (settingsJson && typeof settingsJson === 'object') {
      tenant.updateSettings(settingsJson);
    }

    await this.tenantRepository.save(tenant);

    return Result.ok({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug.value,
      status: tenant.status,
      settingsJson: tenant.settingsJson,
      updatedAt: tenant.updatedAt
    });
  }
}

module.exports = { UpdateTenantSettingsUseCase };
