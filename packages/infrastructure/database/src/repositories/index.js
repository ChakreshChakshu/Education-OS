// Base concrete repository class implementation
class BaseRepository {
  constructor(db) {
    this.db = db;
  }
}

module.exports = { BaseRepository };
