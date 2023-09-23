import { PluginBuilder, type BunPlugin, OnLoadResult } from "bun"
import { CreateAST, GetTypeDefs, GetAllSymbols } from "./clang"
import { SymbolsToFFI } from "./transpiler"

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
            build.onLoad({ filter: /^.*\.h/ }, async (args): Promise<OnLoadResult> => {
                const libPath = args.path.replace(/\.h$/, "")
                const ast = await CreateAST(args.path)
                const typedefs = GetTypeDefs(ast)
                const symbols = GetAllSymbols(ast, typedefs)
                const exported = SymbolsToFFI(symbols, libPath)
                
                return {
                    contents: exported,
                    loader: "ts"
                }
            })
        }
    }

    return plugin
}