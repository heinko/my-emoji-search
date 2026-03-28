import fs from 'fs';
import path from 'path';
import { SUPPORTED_LOCALES } from '../../lib/locale-config';

const REQUIRED_FILES = SUPPORTED_LOCALES.flatMap((locale) => {
  const lexicalFile = `public/data/emoji/emoji-index-${locale.id}.json`;
  return locale.semanticEnabled
    ? [lexicalFile, `public/data/emoji/emoji-vectors-${locale.id}.json`]
    : [lexicalFile];
});

const missingFiles = REQUIRED_FILES.filter((filePath) => {
  const absolutePath = path.join(process.cwd(), filePath);
  return !fs.existsSync(absolutePath);
});

if (missingFiles.length > 0) {
  console.error('Missing required emoji data files:');
  for (const filePath of missingFiles) {
    console.error(`- ${filePath}`);
  }
  console.error('Run `npm run update-emoji` and commit the generated files before deploying.');
  process.exit(1);
}

console.log('Emoji data files are present.');
