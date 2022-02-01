import * as TypeDoc from "typedoc";
import { PluginOptions } from "../types/package.types";

export const parseToJson = async (
  apiDocsPath: string,
  entryPoints: string[],
  tsconfig: string,
  pluginOptions: PluginOptions,
) => {
  // 1. Prepare typedoc application to render
  const app = new TypeDoc.Application();

  // 2. Prepare parser readers
  app.options.addReader(new TypeDoc.TSConfigReader());
  app.options.addReader(new TypeDoc.TypeDocReader());

  // 3. Parser options to bootstrap project
  app.bootstrap({
    excludeExternals: true,
    excludeInternal: true,
    excludePrivate: true,
    excludeProtected: true,
    exclude: ["node_modules", "tests", "__tests__", "*.spec.ts", "*.test.ts"],
    logLevel: "Error",
    entryPointStrategy: "expand",
    ...pluginOptions.typeDocOptions,
    tsconfig,
    entryPoints,
  });

  // 4. Generate json output
  const project = app.convert();
  if (project) {
    await app.generateJson(project, apiDocsPath);
  } else {
    throw new Error("Cannot generate project for dir: " + apiDocsPath);
  }
};
