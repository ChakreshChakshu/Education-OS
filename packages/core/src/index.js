const { Result } = require('./Result');
const { Entity } = require('./Entity');
const { AggregateRoot } = require('./AggregateRoot');
const { ValueObject } = require('./ValueObject');
const { DomainEvents } = require('./DomainEvents');
const errors = require('./Error');

module.exports = {
  Result,
  Entity,
  AggregateRoot,
  ValueObject,
  DomainEvents,
  ...errors
};
