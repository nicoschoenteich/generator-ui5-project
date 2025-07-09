import chalk from "chalk"
import fs from "fs"
import Generator from "yeoman-generator"
import prompts from "./prompts.js"
import {
	lookForParentUI5ProjectAndPrompt,
	addPreviewMiddlewareTestConfig,
	ensureCorrectDestinationPath
} from "../helpers.js"
import path, { dirname } from "path"
import { fileURLToPath } from "url"
const __dirname = dirname(fileURLToPath(import.meta.url))

export default class extends Generator {
	static displayName = "Add a new opa5 test to your uimodule."

	async prompting() {
		// standalone call
		if (!this.options.config) {
			await lookForParentUI5ProjectAndPrompt.call(this, prompts)
			this.options.config.route = this.options.config.viewName.toLowerCase()
		} else {
			await lookForParentUI5ProjectAndPrompt.call(this, () => { }, false)
			this.options.config.testName = "First"
			this.options.config.viewName = "MainView"
			this.options.config.route = ""
			// prioritize manually passed parameter over config from file, as the latter is not up to date when subgenerator is composed
			this.options.config.uimoduleName = this.options.uimoduleName
		}
		// remember tests were generated for post-processing to add the respective types to .tsconfig as well
		this.options.config.enableTests = true
	}

	async writing() {
		this.log(chalk.green(`✨ creating new opa5 journey for ${this.options.config.uimoduleName}`))

		ensureCorrectDestinationPath.call(this)

		addPreviewMiddlewareTestConfig.call(this, "OPA5")

		this.fs.copyTpl(
			// for some reason this.templatePath() doesn't work here
			path.join(__dirname, `templates/pages/View.${this.options.config.enableTypescript ? "ts": "js"}`),
			this.destinationPath(`webapp/test/integration/pages/${this.options.config.viewName}.${this.options.config.enableTypescript ? "ts": "js"}`),
			{
				viewName: this.options.config.viewName,
				uimoduleName: this.options.config.uimoduleName,
				route: this.options.config.route
			}
		)
		this.fs.copyTpl(
			// for some reason this.templatePath() doesn't work here
			path.join(__dirname, `templates/Journey.${this.options.config.enableTypescript ? "ts": "js"}`),
			this.destinationPath(`webapp/test/integration/${this.options.config.testName}Journey.${this.options.config.enableTypescript ? "ts": "js"}`),
			{
				viewName: this.options.config.viewName,
				uimoduleName: this.options.config.uimoduleName,
				route: this.options.config.route
			}
		)

		const uimodulePackageJson = JSON.parse(fs.readFileSync(this.destinationPath("package.json")))
		uimodulePackageJson.scripts["opa5"] = "fiori run --open test/opaTests.qunit.html"
		fs.writeFileSync(this.destinationPath("package.json"), JSON.stringify(uimodulePackageJson, null, 4))
	}

}
