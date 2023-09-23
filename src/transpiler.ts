import { Symbol } from "./clang";
import { existsSync, rm, rmSync } from "fs";

export function SymbolsToFFI(symbols: Symbol[], libPath: string): string {
    // See https://bun.sh/docs/api/ffi
    // Yes, this will be code inside of strings.
    // Not ideal because of a lack of type checking and whatnot
    // but it's the best we can do for static code generation.

    // Check that libPath exists and is a valid .so/.dll/.dylib file
    if (!existsSync(`${libPath}`)) {
        console.error("Remember to compile your library for the correct platform!")
        throw new Error(`Library ${libPath} does not exist! This shouldn't be encountered at this stage!`)
    }

    var out = "import {dlopen, FFIType, suffix} from 'bun:ffi'\n"

    out += `const path = "${libPath}"\n`
    
    for(var symbol of symbols) {
        out += `export const {symbols: {${symbol.name}}} = dlopen(path, {${symbol.name}: {
            args: [${symbol.args.map((arg) => `"${arg}"`).join(", ")}],
            returns: FFIType.${symbol.ret}
        }})\n`
    }

    out += "export const __MADE_WITH_BUNCH = true\n"

    // if (existsSync(".tmp-generated.ts")) {
    //     rmSync(".tmp-generated.ts")
    // }
    // var testfile = Bun.file(".tmp-generated.ts").writer()
    // testfile.write(out)
    // testfile.flush()

    return out;
}