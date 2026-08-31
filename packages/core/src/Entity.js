class Entity {
  constructor(id) {
    this.id = id;
  }

  equals(object) {
    if (object == null || object === undefined) {
      return false;
    }

    if (this === object) {
      return true;
    }

    if (!(object instanceof Entity)) {
      return false;
    }

    return this.id === object.id;
  }
}

module.exports = { Entity };
