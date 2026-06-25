#!/usr/bin/env node

const testUrl = 'http://localhost:3000/api/media/videos/user_3CMgl0E1u3OcgATvBIZR3rByAXo/cmqtpvc460002ncsvs5rd0n0r.mp4';

console.log('Testing:', testUrl);

fetch(testUrl, { method: 'HEAD' })
  .then(res => {
    console.log('Response status:', res.status);
    console.log('Content-Type:', res.headers.get('content-type'));
    console.log('Content-Length:', res.headers.get('content-length'));
  })
  .catch(err => {
    console.error('Error:', err.message);
  });
