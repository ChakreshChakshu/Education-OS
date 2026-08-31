// Placeholder Data Transfer Objects for various domains
class CreateUserDto {
  constructor(email, password, role) {
    this.email = email;
    this.password = password;
    this.role = role;
  }
}

class UserResponseDto {
  constructor(id, email, role, isVerified) {
    this.id = id;
    this.email = email;
    this.role = role;
    this.isVerified = isVerified;
  }
}

module.exports = {
  CreateUserDto,
  UserResponseDto
};
