import { program } from "commander";
import { loadOptionsFromFile } from "../lib/load-options.js";
import { Project } from "../lib/project.js";

const cliOptions = program
  .option("-c, --config <path>", "Path to config file", "doc-check.json")
  .parse()
  .opts();

const projectOptions = loadOptionsFromFile(cliOptions.config, false);
const project = new Project(projectOptions);
const { error } = await project.checkMarkdown();
process.exit(error ? 1 : 0);
