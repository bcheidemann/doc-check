import { Project } from "../lib/project.js";

const project = new Project();
const { code } = project.checkMarkdownSync();
process.exit(code);
