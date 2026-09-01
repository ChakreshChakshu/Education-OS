const { Result } = require('../../core');
const { Tenant } = require('../../domain/entities/Tenant');
const { Organization } = require('../../domain/entities/Organization');
const { UserTenantMembership } = require('../../domain/entities/UserTenantMembership');
const { OrganizationMembership } = require('../../domain/entities/OrganizationMembership');
const { TenantSlug } = require('../../domain/value-objects/TenantSlug');

class CreateTenantUseCase {
  constructor({ tenantRepository, userRepository, organizationRepository }) {
    this.tenantRepository = tenantRepository;
    this.userRepository = userRepository;
    this.organizationRepository = organizationRepository;
  }

  async execute(dto) {
    const { name, slug, ownerUserId, orgName, orgCode } = dto;

    const slugVoResult = TenantSlug.create(slug);
    if (slugVoResult.isFailure) {
      return Result.fail(slugVoResult.error);
    }
    const slugVo = slugVoResult.getValue();

    const existingTenant = await this.tenantRepository.findBySlug(slugVo.value);
    if (existingTenant) {
      return Result.fail('Tenant with this slug already exists.');
    }

    const ownerUser = await this.userRepository.findById(ownerUserId);
    if (!ownerUser) {
      return Result.fail('Owner user not found.');
    }

    // 1. Create Tenant Aggregate
    const tenantResult = Tenant.create({ name, slug: slugVo });
    if (tenantResult.isFailure) {
      return Result.fail(tenantResult.error);
    }
    const tenant = tenantResult.getValue();
    await this.tenantRepository.save(tenant);

    // 2. Create Default Branch Organization
    const orgResult = Organization.create({
      tenantId: tenant.id,
      name: orgName || 'Main Branch',
      code: orgCode || 'MAIN'
    });
    if (orgResult.isFailure) {
      return Result.fail(orgResult.error);
    }
    const organization = orgResult.getValue();
    await this.organizationRepository.save(organization);

    // 3. Link User to Tenant Gateway
    const utmResult = UserTenantMembership.create({
      userId: ownerUser.id,
      tenantId: tenant.id,
      status: 'ACTIVE'
    });
    if (utmResult.isFailure) {
      return Result.fail(utmResult.error);
    }
    const userTenantMembership = utmResult.getValue();
    await this.tenantRepository.saveUserMembership(userTenantMembership);

    // 4. Assign TENANT_OWNER role in default Organization
    const omResult = OrganizationMembership.create({
      organizationId: organization.id,
      userId: ownerUser.id,
      role: 'TENANT_OWNER',
      status: 'ACTIVE'
    });
    if (omResult.isFailure) {
      return Result.fail(omResult.error);
    }
    const organizationMembership = omResult.getValue();
    await this.organizationRepository.saveMembership(organizationMembership);

    return Result.ok({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug.value,
        status: tenant.status
      },
      organization: {
        id: organization.id,
        name: organization.name,
        code: organization.code
      },
      membership: {
        userId: ownerUser.id,
        role: organizationMembership.role
      }
    });
  }
}

module.exports = { CreateTenantUseCase };
