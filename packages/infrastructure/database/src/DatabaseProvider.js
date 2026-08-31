class DatabaseProvider {
  constructor() {
    if (this.constructor === DatabaseProvider) {
      throw new Error("Abstract class 'DatabaseProvider' cannot be instantiated directly.");
    }
  }

  async connect() {
    throw new Error("Method 'connect()' must be implemented.");
  }

  async disconnect() {
    throw new Error("Method 'disconnect()' must be implemented.");
  }

  getClient() {
    throw new Error("Method 'getClient()' must be implemented.");
  }
}

module.exports = { DatabaseProvider };
