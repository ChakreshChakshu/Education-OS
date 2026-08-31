// Common utilities
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

module.exports = {
  delay,
  generateId
};
