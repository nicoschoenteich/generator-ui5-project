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
	static displayName = "Add a new qunit test to your uimodule."

	async prompting() {
		// standalone call
		if (!this.options.config) {
			await lookForParentUI5ProjectAndPrompt.call(this, prompts)
		} else {
			await lookForParentUI5ProjectAndPrompt.call(this, () => { }, false)
			this.options.config.testName = "First"
			// prioritize manually passed parameter over config from file, as the latter is not up to date when subgenerator is composed
			this.options.config.uimoduleName = this.options.uimoduleName
		}
		// remember tests were generated for post-processing to add the respective types to .tsconfig as well
		this.options.config.enableTests = true
	}

	async writing() {
		this.log(chalk.green(`✨ creating new qunit test for ${this.options.config.uimoduleName}`))

		ensureCorrectDestinationPath.call(this)

		addPreviewMiddlewareTestConfig.call(this, "Qunit")

		const fileEnding = this.options.config.enableTypescript ? "ts" : "js"
		this.fs.copyTpl(
			// for some reason this.templatePath() doesn't work here
			path.join(__dirname, `templates/Test.${fileEnding}`),
			this.destinationPath(`webapp/test/unit/${this.options.config.testName}Test.${fileEnding}`),
			{ testName: this.options.config.testName }
		)

		const uimodulePackageJson = JSON.parse(fs.readFileSync(this.destinationPath("package.json")))
		uimodulePackageJson.scripts["qunit"] = "fiori run --open test/unitTests.qunit.html"
		fs.writeFileSync(this.destinationPath("package.json"), JSON.stringify(uimodulePackageJson, null, 4))
	}

}
