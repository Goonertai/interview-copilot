import type {NextConfig} from 'next';
const config: NextConfig = {
  outputFileTracingExcludes: {'/api/answer': ['./.env*', './env.local']},
  outputFileTracingIncludes: {
    '/api/answer': ['./prompts/*.md', './knowledge/system-design/*.md', './knowledge/system-design/index.json']
  }
};
export default config;
