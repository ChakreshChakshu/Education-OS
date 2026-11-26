const { MailProvider } = require('./MailProvider');
const { ResendMailProvider } = require('./ResendMailProvider');
const { createPasswordResetLink, getPasswordResetBaseUrl } = require('./passwordResetLink');

module.exports = {
  MailProvider,
  ResendMailProvider,
  createPasswordResetLink,
  getPasswordResetBaseUrl
};
