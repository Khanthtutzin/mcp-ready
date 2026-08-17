import { describe, expect, it } from 'vitest';
import { tokenizeCommand } from '../src/transport/stdio.js';

describe('tokenizeCommand', () => {
  it('splits on whitespace', () => {
    expect(tokenizeCommand('node server.js --port 3000')).toEqual([
      'node',
      'server.js',
      '--port',
      '3000',
    ]);
  });

  it('keeps double-quoted segments together', () => {
    expect(tokenizeCommand('node "my server.js" run')).toEqual([
      'node',
      'my server.js',
      'run',
    ]);
  });

  it('keeps single-quoted segments together', () => {
    expect(tokenizeCommand("node 'my server.js'")).toEqual(['node', 'my server.js']);
  });

  it('preserves Windows path separators', () => {
    // A naive escape handler would eat the backslashes here.
    expect(tokenizeCommand('node C:\\Users\\dev\\server.js')).toEqual([
      'node',
      'C:\\Users\\dev\\server.js',
    ]);
  });

  it('preserves backslashes inside quotes', () => {
    expect(tokenizeCommand('node "C:\\Program Files\\app\\server.js"')).toEqual([
      'node',
      'C:\\Program Files\\app\\server.js',
    ]);
  });

  it('honours escaped quotes', () => {
    expect(tokenizeCommand('echo \\"hello\\"')).toEqual(['echo', '"hello"']);
  });

  it('collapses runs of whitespace', () => {
    expect(tokenizeCommand('  node    server.js  ')).toEqual(['node', 'server.js']);
  });

  it('preserves a deliberately empty argument', () => {
    expect(tokenizeCommand('node server.js ""')).toEqual(['node', 'server.js', '']);
  });

  it('rejects an unterminated quote', () => {
    expect(() => tokenizeCommand('node "server.js')).toThrow(/Unterminated/);
  });
});
