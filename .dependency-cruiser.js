/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies are strictly forbidden across the monorepo.',
      from: {},
      to: {
        circular: true
      }
    },
    {
      name: 'domain-no-infrastructure',
      severity: 'error',
      comment: 'Domain code must never depend on Infrastructure code or providers.',
      from: {
        path: 'packages/modules/[^/]+/domain/'
      },
      to: {
        path: 'packages/infrastructure/|packages/modules/[^/]+/infrastructure/'
      }
    },
    {
      name: 'domain-no-presentation',
      severity: 'error',
      comment: 'Domain code must never depend on Presentation code.',
      from: {
        path: 'packages/modules/[^/]+/domain/'
      },
      to: {
        path: 'packages/modules/[^/]+/presentation/'
      }
    },
    {
      name: 'application-no-presentation',
      severity: 'error',
      comment: 'Application use cases must never depend on Presentation handlers.',
      from: {
        path: 'packages/modules/[^/]+/application/'
      },
      to: {
        path: 'packages/modules/[^/]+/presentation/'
      }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules'
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+'
      }
    }
  }
};
