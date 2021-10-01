const ipAddress = '145.133.9.162';
   
export const environment = {
  production: true,
  apiRestUrl: 'http://' + ipAddress + ':8102/',
  nodeApiRestUrl: 'http://' + ipAddress + ':8000/',
  webSocketUrl: 'ws:/' + ipAddress + ':7104/events/vehicle/verification',  
};