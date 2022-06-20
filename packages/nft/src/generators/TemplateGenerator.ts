import * as Handlebars from 'handlebars';

import * as path from 'path';
import * as fs from 'fs';

export interface Contracts {
  [key: string]: string;
}

export default class TemplateGenerator {
  static async generate(src: string, context: any): Promise<string> {
    const templateSource = await fs.promises.readFile(path.resolve(__dirname, src), 'utf8');

    const template = Handlebars.compile(templateSource);

    return template(context);
  }
}
