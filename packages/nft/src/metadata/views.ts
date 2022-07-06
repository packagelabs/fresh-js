// TODO: make this better...
//
// I'm tempted to use classes (with static fields instead of DisplayView.TYPE)
// but would like to avoid forcing users to use the 'new' keyword.

export interface View {
  name: string;
  options: any;
}

const DISPLAY = 'display';

export function DisplayView(fields: { name: string; description: string; thumbnail: string }): View {
  return {
    name: DISPLAY,
    options: {
      fields,
    },
  };
}

DisplayView.TYPE = DISPLAY;
