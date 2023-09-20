import { PluginBuilder, type BunPlugin, OnLoadResult } from "bun"
import { readFileSync } from "fs"

// Plugin factory function

export type HbunConfig = {

}

// This is all strings because it will be used to generate typescript code.
export type Symbol = {
    name: string
    args: string[]
    ret: string
}

export default function hbun(config: HbunConfig): BunPlugin {
    var plugin = {
        name: "hbun",
        async setup(build: PluginBuilder) {
            const {readFileSync} = await import("fs");

            build.onLoad({ filter: /\.h$/ }, async (args): Promise<OnLoadResult> => {
                // Read the file text
                var text = readFileSync(args.path).toString()

                // TODO: Run the C preprocessor on the file text, as sometimes logic is embedded in the preprocessor directives
                // We could link to something like the LLVM C compiler and read the AST instead of trying to make sense of 
                // C ourselves, but that'll be a while.
                
                console.warn("Preprocessor directives are not yet supported!")
                text = text.replace(/#\s+/g, "")

                // Strip out C-style comments
                text = text.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "")

                // Split into individual statements
                var statements = text.split(";")

                var exported = ""
                // Define the pointer type that all libraries will use.
                exported += "import { dlopen, FFIType, suffix } from 'bun:ffi'\n"
                exported += "export const test = 1\n"
                return {
                    contents: exported,
                    loader: "ts"
                }
            })
        }
    }

    return plugin
}