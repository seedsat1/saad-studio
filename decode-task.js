const failed = [
  'eyJuYW1lIjoidjFfQ2hkRFV6bGhZWFpFVDB3dGVVb3RjMEZRZUhKWVlXOUJkeElYUTFNNVlXRjJSRTlNTFhsS0xYTkJVSGh5V0dGdlFYYyIsIm1vZGVsIjoiZ2VtaW5pLW9tbmktZmxhc2gtcHJldmlldyJ9',
];
const successful = [
  'eyJuYW1lIjoidjFfQ2hkMFUzaGhZWFZwV1VSbFpWWmZkVTFRYm1SaU1IRkJOQklYZEZONFlXRjFhVmxFWldWV1gzVk5VRzVrWWpCeFFUUSIsIm1vZGVsIjoiZ2VtaW5pLW9tbmktZmxhc2gtcHJldmlldyJ9',
  'eyJuYW1lIjoidjFfQ2hkeWFYUmhZWEZmTlVWdlYwY3RPRmxRYTI5eFEyZEJUUklYY21sMFlXRnhYelZGYjFkSExUaFpVR3R2Y1VOblFVMCIsIm1vZGVsIjoiZ2VtaW5pLW9tbmktZmxhc2gtcHJldmlldyJ9',
  'eyJuYW1lIjoidjFfQ2hka2VXeGhZWFpEYTB4MllsSnFUV05RTUdaMmVUSkJjeElYWkhsc1lXRjJRMnRNZG1KU2FrMWpVREJtZG5reVFYTSIsIm1vZGVsIjoiZ2VtaW5pLW9tbmktZmxhc2gtcHJldmlldyJ9'
];

console.log("=== FAILED ===");
failed.forEach(f => console.log(Buffer.from(f, 'base64').toString('utf8')));

console.log("=== SUCCESSFUL ===");
successful.forEach(s => console.log(Buffer.from(s, 'base64').toString('utf8')));
