import dependencies from "../dependencies.js"
import { ensureCorrectDestinationPath } from "../helpers.js"
import fs from "fs"
import Generator from "yeoman-generator"
import yaml from "yaml"

export default class extends Generator {
	writing() {
		ensureCorrectDestinationPath.call(this)

		const deleteProxyToUI5 = (file) => {
			const middleware = file.server.customMiddleware.find(m => m.name === "fiori-tools-proxy")
			if (middleware) {
				delete middleware.configuration["ui5"]
			}
		}

		const ui5Yaml = yaml.parse(fs.readFileSync(this.destinationPath("ui5.yaml")).toString())
		const indexHtml = fs.readFileSync(this.destinationPath("webapp/index.html")).toString()
		const manifestJSON = JSON.parse(fs.readFileSync(this.destinationPath("webapp/manifest.json")))

		ui5Yaml.framework = {
			libraries: [
				{ name: "sap.m" },
				{ name: "sap.ui.core" },
				{ name: "themelib_sap_horizon" }
			]
		}

		switch (this.options.config.ui5Libs) {
			case "Content delivery network (OpenUI5)":
				delete ui5Yaml.framework
				ui5Yaml.server.customMiddleware.forEach(middleware => {
					if (middleware.name === "fiori-tools-proxy") {
						middleware.configuration.ui5.url = "https://sdk.openui5.org"
					}
				})
				fs.writeFileSync(
					this.destinationPath("webapp/index.html"),
					indexHtml.replace(`src="resources/sap-ui-core.js"`, `src="https://sdk.openui5.org/${dependencies["OpenUI5"]}/resources/sap-ui-core.js"`)
				)
				manifestJSON["sap.ui5"]["dependencies"]["minUI5Version"] = dependencies["OpenUI5"]
				break
			case "Content delivery network (SAPUI5)":
				delete ui5Yaml.framework
				fs.writeFileSync(
					this.destinationPath("webapp/index.html"),
					indexHtml.replace(`src="resources/sap-ui-core.js"`, `src="https://ui5.sap.com/${dependencies["SAPUI5"]}/resources/sap-ui-core.js"`)
				)
				manifestJSON["sap.ui5"]["dependencies"]["minUI5Version"] = dependencies["SAPUI5"]
				break
			case "Local resources (OpenUI5)":
				ui5Yaml.framework.name = "OpenUI5"
				ui5Yaml.framework.version = dependencies["OpenUI5"]
				deleteProxyToUI5(ui5Yaml)
				manifestJSON["sap.ui5"]["dependencies"]["minUI5Version"] = dependencies["OpenUI5"]
				break
			case "Local resources (SAPUI5)":
				ui5Yaml.framework.name = "SAPUI5"
				ui5Yaml.framework.version = dependencies["SAPUI5"]
				deleteProxyToUI5(ui5Yaml)
				manifestJSON["sap.ui5"]["dependencies"]["minUI5Version"] = dependencies["SAPUI5"]
				break
		}

		if (this.options.config.enableFPM) {
			ui5Yaml.framework.libraries.push({
				name: "sap.fe.templates"
			})
			ui5Yaml.server.customMiddleware = ui5Yaml.server.customMiddleware.filter(middleware => middleware.name !== "sap-fe-mockserver")
			const ui5YamlMock = yaml.parse(fs.readFileSync(this.destinationPath("ui5-mock.yaml")).toString())
			ui5YamlMock.framework = {
				name: "SAPUI5",
				version: dependencies["SAPUI5"],
				libraries: [
					{ name: "sap.m" },
					{ name: "sap.ui.core" },
					{ name: "themelib_sap_horizon" },
					{ name: "sap.fe.templates" }
				]
			}
			for (const file of [ui5Yaml, ui5YamlMock]) {
				deleteProxyToUI5(file)
			}
			fs.writeFileSync(this.destinationPath("ui5-mock.yaml"), yaml.stringify(ui5YamlMock))
		}

		fs.writeFileSync(this.destinationPath("ui5.yaml"), yaml.stringify(ui5Yaml))
		fs.unlinkSync(this.destinationPath("webapp/manifest.json")) // avoid conflict/auto-prompt by yeoman
		fs.writeFileSync(this.destinationPath("webapp/manifest.json"), JSON.stringify(manifestJSON, null, 4))

		// remove option to bootstrap from local UI5 sources, as UI5 source is part of user selection
		fs.unlinkSync(this.destinationPath("ui5-local.yaml"))
		const packageJson = JSON.parse(fs.readFileSync(this.destinationPath("package.json")))
		delete packageJson.scripts["start-local"]
		fs.unlinkSync(this.destinationPath("package.json")) // avoid conflict/auto-prompt by yeoman
		fs.writeFileSync(this.destinationPath("package.json"), JSON.stringify(packageJson, null, 4))
	}
}
