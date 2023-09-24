import { basename } from "path";
import { BunchConfig } from ".";
import { Symbol } from "./clang";
import { existsSync,rmSync, mkdirSync } from "fs";
import { FFIType, suffix } from "bun:ffi";

export function SymbolsToFFI(symbols: Symbol[], libPath: string, config: BunchConfig): string {
    // See https://bun.sh/docs/api/ffi
    // Writes the javascript code as a string as well as a .d.ts file if requested

    // Check that libPath exists and is a valid .so/.dll/.dylib file
    if (!existsSync(`${libPath}`)) {
        throw new Error(`Library ${libPath} does not exist! This shouldn't be encountered at this stage!`)
    }

    // Create javascript code 
    var js = "import {dlopen, FFIType, suffix} from 'bun:ffi'\n"

    js += `const path = "${libPath}"\n`
    
    for(var symbol of symbols) {
        js += `export const {symbols: {${symbol.name}}} = dlopen(path, {${symbol.name}: {
            args: [${symbol.args.map((arg) => `"${arg}"`).join(", ")}],
            returns: FFIType.${symbol.ret}
        }})\n`
    }

    js += "export const __MADE_WITH_BUNCH = true\n"

    // Create typescript definitions
    if (config.create_d_ts) {
        const libName = basename(libPath).replace("." + (config.lib_ext ?? suffix), ".h")

        var ts = "import {CString, Pointer, JSCallback} from 'bun:ffi'\n"
        ts += `declare module "${libName}" {\n`
        
        for (var symbol of symbols) {
            ts += `    function ${symbol.name}(${symbol.args.map((arg, index) => `arg${index}: ${FFIType_to_TS(arg, true)}`).join(", ")}): ${FFIType_to_TS(symbol.ret, false)}\n`
        }

        ts += `    const __MADE_WITH_BUNCH: true\n`
        ts += `}\n`

        const filePath = `${config.bunch_dir}/types/${libName}/index.d.ts`

        // Create the directory if it doesn't exist
        if (!existsSync(`${config.bunch_dir}/types/${libName}`)) {
            mkdirSync(`${config.bunch_dir}/types/${libName}`, {recursive: true})
        }

        // Write the file
        rmSync(filePath, {force: true})
        const file = Bun.file(filePath).writer()
        file.write(ts)
        file.end()
    }

    return js;
}

function FFIType_to_TS(type: string, is_param: boolean): string {
    if (!(type in FFIType)) {
        throw new Error(`Unknown FFIType ${type}, this shouldn't happen!`)
    }

    const ffiType = FFIType[type as keyof typeof FFIType]

    switch (ffiType) {
        case FFIType.bool:
            return "boolean"
        case FFIType.char:
            return "number"
        case FFIType.cstring:
            return is_param ? "TypedArray | Pointer | CString | null" : "CString"

        case FFIType.u8:
        case FFIType.u16:
        case FFIType.u32:
        case FFIType.u64:
        case FFIType.i8:
        case FFIType.i16:
        case FFIType.i32:
        case FFIType.i64:
        case FFIType.f32:
        case FFIType.f64:
            return "number"

        case FFIType.ptr:
            return "Pointer"
        
        case FFIType.function:
            return is_param ? "Pointer | JSCallback" : "Pointer"
        
        case FFIType.void:
            return "void"
        
        default:
            throw new Error(`Unknown FFIType ${ffiType}, this shouldn't happen!`)
    }
}