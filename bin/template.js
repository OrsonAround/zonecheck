const template = require('lodash/template');
const glob = require('glob');

const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();

const data = {
  ...process.env,
};
const DIST_FOLDER = 'dist';
const SRC_FOLDER = 'src';

fs.rmdir(path.resolve(process.cwd(), DIST_FOLDER), { recursive: true }).then(
  () => {
    glob(
      `${SRC_FOLDER}/**/*`,
      { ignore: '**/test/**/*' },
      async (err, matches) => {
        await Promise.all(
          matches.map(async (filename) => {
            const stat = await fs.lstat(filename);
            if (stat.isDirectory()) {
              return;
            }
            const src = path.join(process.cwd(), filename);
            const type = filename.split(path.sep).reverse()[1];
            const extname = path.extname(src);
            const basename = path.basename(src, extname);
            const distDir = path
              .dirname(src)
              .replace(`${SRC_FOLDER}/`, `${DIST_FOLDER}/`);

            try {
              await fs.access(distDir);
            } catch (e) {
              await fs.mkdir(distDir, { recursive: true });
            }
            const fileContent = await fs.readFile(src, 'utf8');
            let result = fileContent;
            let dist = path.join(distDir, `${basename}${extname}`);
            if (extname === '.tmpl') {
              const compiled = template(fileContent, { variable: 'data' });
              result = compiled(data);
              dist = path.join(distDir, `${basename}.${type}`);
            }
            await fs.writeFile(dist, result, 'utf8');
          }),
        );
      },
    );
  },
);
