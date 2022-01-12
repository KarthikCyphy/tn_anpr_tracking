const ipAddress = window.location.hostname;
   
export const environment = {
  production: true,
  apiRestUrl: 'http://' + ipAddress + ':8102/',
  nodeApiRestUrl: 'http://' + ipAddress + ':8000/',
  ANPRRestUrl: 'http://' + ipAddress + ':7105/',
  webSocketUrl: 'ws:/' + ipAddress + ':7105/events/ovi',  
};