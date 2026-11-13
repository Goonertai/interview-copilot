import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {getApiKey} from '../lib/server-config';

test('loads saved local key after startup even with an empty inherited variable',()=>{
 const root=mkdtempSync(join(tmpdir(),'copilot-env-'));
 try {
  assert.throws(()=>getApiKey(root,{}),/beside package.json/);
  writeFileSync(join(root,'.env.local'),'\uFEFFOPENAI_API_KEY="test-only-key"\r\n');
  assert.equal(getApiKey(root,{OPENAI_API_KEY:''}),'test-only-key');
  assert.equal(getApiKey(root,{OPENAI_API_KEY:' environment-key '}),'environment-key');
  writeFileSync(join(root,'.env.local'),'OPENAI_API_KEY=updated-test-key\n');
  assert.equal(getApiKey(root,{}),'updated-test-key');
 } finally {rmSync(root,{recursive:true,force:true});}
});

test('diagnoses Windows filename, encoding and missing variable without exposing contents',()=>{
 const root=mkdtempSync(join(tmpdir(),'copilot-env-'));
 try {
  writeFileSync(join(root,'.env.local.txt'),'private-test-value');
  assert.throws(()=>getApiKey(root,{}),/Rename it to exactly .env.local/);
  writeFileSync(join(root,'.env.local'),Buffer.from('OPENAI_API_KEY=private-test-value','utf16le'));
  assert.throws(()=>getApiKey(root,{}),/UTF-8/);
  writeFileSync(join(root,'.env.local'),'private-test-value\n');
  assert.throws(()=>getApiKey(root,{}),e=>e instanceof Error && /non-empty OPENAI_API_KEY/.test(e.message) && !e.message.includes('private-test-value'));
 } finally {rmSync(root,{recursive:true,force:true});}
});
