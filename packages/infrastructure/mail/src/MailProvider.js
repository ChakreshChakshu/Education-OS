class MailProvider {
  constructor() {
    if (this.constructor === MailProvider) {
      throw new Error("Abstract class 'MailProvider' cannot be instantiated directly.");
    }
  }

  async sendMail(to, subject, body, options = {}) {
    throw new Error("Method 'sendMail()' must be implemented.");
  }
}

module.exports = { MailProvider };
