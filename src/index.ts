import { PluginBuilder, type BunPlugin, OnLoadResult } from "bun"
import { CreateAST, GetTypeDefs, GetAllSymbols } from "./clang"
import { SymbolsToFFI } from "./transpiler"
import { existsSync } from "fs"
import { basename } from "path"
import { suffix } from "bun:ffi"

// Plugin factory function

export type BunchConfig = {
    lib_dirs: string[]
    honor_ld_library_path: boolean
    honor_ld_preload: boolean
    lib_ext?: string
    bunch_dir: string
    create_d_ts: boolean
    use_cache: boolean
}

// This is all strings because it will be used to generate typescript code.
export type Symbol = {
    name: string
    args: string[]
    ret: string
}

export function prepare_config(config: Partial<BunchConfig>): BunchConfig {
    return {
        lib_dirs: config.lib_dirs ?? ["/usr/lib", "/usr/local/lib"],
        honor_ld_library_path: config.honor_ld_library_path ?? true,
        honor_ld_preload: config.honor_ld_preload ?? true,
        bunch_dir: config.bunch_dir ?? "./.bunch",
        create_d_ts: config.create_d_ts ?? true,
        use_cache: config.use_cache ?? true,
    }
}

export function find_library(lib: string, config: BunchConfig): string | undefined {
    // Create a list of possible library paths
    var paths = config.lib_dirs
    
    if (config.honor_ld_preload) {
        // Begin by checking if the file is among those in LD_PRELOAD before anything else
        var ld_preload = process.env.LD_PRELOAD
        if (ld_preload) {
            var filesToTest = ld_preload.split(":")
            for (var file of filesToTest) {
                if (basename(file) == lib) {
                    return file
                }
            }
        }
    }
    
    if (config.honor_ld_library_path) {
        var ld_library_path = process.env.LD_LIBRARY_PATH
        if (ld_library_path) {
            paths = ld_library_path.split(":").concat(paths)
        }
    }

    // Find the first path that exists
    for (var path of paths) {
        if (existsSync(`${path}/${lib}`)) {
            return `${path}/${lib}`
        }
    }

    return undefined
}

export default function bunch(config: Partial<BunchConfig>): BunPlugin {
    var plugin = {
        name: "bunch",
        async setup(build: PluginBuilder) {
            build.onLoad({ filter: /^.*\.h/ }, async (args): Promise<OnLoadResult> => {
                const libName = basename(args.path).replace(".h", "." + (config.lib_ext ?? suffix))
                const libPath = find_library(libName, prepare_config(config))
                if (!libPath) {
                    console.error(`Bun[c/h] couldn't find the library ${libName}!`)
                    console.error(`Verify your config and that the library is installed.`)
                    console.error(`If you're using LD_PRELOAD, make sure it's set correctly.`)
                    throw new Error(`Library ${libName} not found!`)
                }

                const ast = await CreateAST(args.path, prepare_config(config))
                const typedefs = GetTypeDefs(ast)
                const symbols = GetAllSymbols(ast, typedefs)

                const exported = SymbolsToFFI(symbols, libPath, prepare_config(config))
                
                return {
                    contents: exported,
                    loader: "js"
                }
            })
        }
    }

    return plugin
}