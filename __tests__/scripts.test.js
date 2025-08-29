const fs = require('fs');

test('assets/scripts.js loads', () => {
  const code = fs.readFileSync('assets/scripts.js', 'utf8');
  expect(code.length).toBeGreaterThan(0);
});
