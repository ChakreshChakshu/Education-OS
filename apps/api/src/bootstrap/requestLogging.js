function requestLogDetails(request) {
  return {
    method: request.method,
    url: request.url?.split('?')[0],
    version: request.headers?.['accept-version'],
    hostname: request.hostname,
    remoteAddress: request.ip,
    remotePort: request.socket?.remotePort
  };
}

module.exports = { requestLogDetails };
