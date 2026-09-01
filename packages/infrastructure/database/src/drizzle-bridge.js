let drizzlePgCore, drizzleOrm;

try {
  drizzlePgCore = require('drizzle-orm/pg-core');
} catch (e) {
  // Lightweight standalone fallback builder for Drizzle ORM schema definitions
  const chainable = () => {
    const obj = {
      primaryKey: () => obj,
      notNull: () => obj,
      unique: () => obj,
      default: () => obj,
      defaultNow: () => obj,
      references: () => obj
    };
    return obj;
  };

  drizzlePgCore = {
    pgTable: (tableName, columns, extraFn) => {
      const tableObj = { __tableName: tableName, ...columns };
      if (extraFn) {
        const extra = extraFn(tableObj);
        tableObj.__extra = extra;
      }
      return tableObj;
    },
    uuid: (name) => chainable(),
    varchar: (name) => chainable(),
    text: (name) => chainable(),
    timestamp: (name) => chainable(),
    integer: (name) => chainable(),
    jsonb: (name) => chainable(),
    boolean: (name) => chainable(),
    real: (name) => chainable(),
    doublePrecision: (name) => chainable(),
    uniqueIndex: (name) => ({
      on: (...cols) => ({ name, type: 'unique', cols })
    }),
    index: (name) => ({
      on: (...cols) => ({ name, type: 'index', cols })
    })
  };
}

try {
  drizzleOrm = require('drizzle-orm');
} catch (e) {
  drizzleOrm = {
    eq: (col, val) => ({ type: 'eq', col, val }),
    and: (...conditions) => ({ type: 'and', conditions }),
    isNull: (col) => ({ type: 'isNull', col })
  };
}

module.exports = {
  ...drizzlePgCore,
  ...drizzleOrm
};
