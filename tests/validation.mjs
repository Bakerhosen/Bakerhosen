import assert from 'node:assert/strict';
import { mapsSchema, titleSchema, nicknameSchema, optionSchema } from '../lib/validation.ts';
for (const value of ['', 'https://maps.app.goo.gl/abc', 'https://www.google.com/maps/place/Vienna', 'https://google.at/maps']) assert.ok(mapsSchema.safeParse(value).success,value);
for (const value of ['javascript:alert(1)', 'http://google.com/maps', 'https://google.com.evil.com/maps', 'https://google.evil/maps', 'https://user:password@google.com/maps', 'https://example.com/maps']) assert.equal(mapsSchema.safeParse(value).success,false,value);
assert.equal(titleSchema.safeParse('   ').success,false);
assert.equal(nicknameSchema.safeParse('x'.repeat(41)).success,false);
assert.equal(optionSchema.safeParse({place:'Café',localTime:'bad-date',mapsUrl:''}).success,false);
console.log('PASS: input limits and safe Google Maps URLs.');
