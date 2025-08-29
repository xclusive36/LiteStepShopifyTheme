const fs = require('fs');

test('demo-products.json exists and has correct shape', () => {
  const raw = fs.readFileSync('assets/demo-products.json', 'utf8');
  const json = JSON.parse(raw);
  expect(json).toBeDefined();
  expect(Array.isArray(json.products)).toBe(true);
  json.products.forEach(p => {
    expect(typeof p.handle).toBe('string');
    expect(typeof p.title).toBe('string');
    expect(typeof p.price).toBe('number');
    expect(Array.isArray(p.images)).toBe(true);
    expect(Array.isArray(p.variants)).toBe(true);
  });
});
