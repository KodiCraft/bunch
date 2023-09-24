import { spawn } from "bun"
import { rmSync, existsSync, readdirSync, mkdirSync } from "fs"
import { SHA256 } from "bun"
import { basename } from "path"
import { BunchConfig } from "."

type Empty = Record<PropertyKey, never>
type Location = Empty | {
    offset: number
    file: string | undefined
    line: number
    col: number
    tokLen: number
}

// Basic components of an ASTNode, individual nodes will extend this.
export interface ASTNode {
    id: string
    kind: string
    loc: Location
    range: {begin: Location, end: Location}
    inner?: ASTNode[]
}

export class ASTCache {
    libname: string
    hash: string
    ast: ASTNode

    constructor(libname: string, hash: string, ast: ASTNode) {
        this.libname = libname
        this.hash = hash
        this.ast = ast
    }

    async Check(lib: string): Promise<boolean> {
        const hash = SHA256.hash(await Bun.file(lib).arrayBuffer()).toString()
        return hash === this.hash
    }

    toString(): string {
        return JSON.stringify(this)
    }

    static async FromFile(lib: string, ast: ASTNode): Promise<ASTCache> {
        const hash = SHA256.hash(await Bun.file(lib).arrayBuffer()).toString()
        return new ASTCache(lib, hash, ast)
    }

    static async TryCache(lib: string, cachedir: string): Promise<ASTCache | undefined> {
        if (!existsSync(cachedir)) {
            mkdirSync(cachedir, {recursive: true})
        }
        const dirList = readdirSync(cachedir)
        const filename = basename(lib)
        const cacheFiles = dirList.filter((file) => file == filename + ".astcache" )
        if (cacheFiles.length == 0) { return undefined }

        // Evaluate the file's hash
        const hash = SHA256.hash(await Bun.file(lib).arrayBuffer()).toString()
        for (const file of cacheFiles) {
            const cache = JSON.parse(await Bun.file(cachedir + "/" + file).text()) as ASTCache
            if (cache.hash == hash) {
                return cache
            } else {
                rmSync(file)
            }
        }

        return undefined
    }
}

// The nodes that we are interested in are:
// - Function declarations
// - Parameter declarations
// - Type declarations
// - Built-in types

// Function declarations
export interface FunctionDecl extends ASTNode {
    kind: "FunctionDecl"
    name: string
    mangledName: string
    type: {qualType: string}
    inner: ASTNode[]
}

// Parameter declarations
export interface ParamVarDecl extends ASTNode {
    kind: "ParmVarDecl"
    name: string
    type: {qualType: string}
}

// Type declarations
export interface TypedefDecl extends ASTNode {
    kind: "TypedefDecl"
    name: string
    type: {qualType: string, desugaredQualType: string | undefined}
}

// Built-in types
export interface BuiltinType extends ASTNode {
    kind: "BuiltinType"
    type: {qualType: string}
    inner: undefined
}

export function isFunctionDecl(node: ASTNode): node is FunctionDecl {
    if (node.kind === "FunctionDecl") {
        // Check that it has its required fields
        if (!Object.hasOwn(node, "name")) { 
            console.warn(`Node ${node.id} claims to be a function but it has no name!`) 
            return false
        }
        if (!Object.hasOwn(node, "mangledName")) { 
            console.warn(`Node ${node.id} claims to be a function but it has no mangledName!`) 
            return false
        }
        if (!Object.hasOwn(node, "type")) { 
            console.warn(`Node ${node.id} claims to be a function but it has no type!`) 
            return false
        }
        
        return true
    } else {
        return false
    }
}

export function isParamVarDecl(node: ASTNode): node is ParamVarDecl {
    if (node.kind === "ParmVarDecl") {
        // Check that it has its required fields
        if (!Object.hasOwn(node, "name")) { 
            console.warn(`Node ${node.id} claims to be a parameter but it has no name!`) 
            return false
        }
        if (!Object.hasOwn(node, "type")) { 
            console.warn(`Node ${node.id} claims to be a parameter but it has no type!`) 
            return false
        }
        
        return true
    } else {
        return false
    }
}

export function isTypedefDecl(node: ASTNode): node is TypedefDecl {
    if (node.kind === "TypedefDecl") {
        // Check that it has its required fields
        if (!Object.hasOwn(node, "name")) { 
            console.warn(`Node ${node.id} claims to be a typedef but it has no name!`) 
            return false
        }
        if (!Object.hasOwn(node, "type")) { 
            console.warn(`Node ${node.id} claims to be a typedef but it has no type!`) 
            return false
        }
        
        return true
    } else {
        return false
    }
}

function isBuiltinType(node: ASTNode): node is BuiltinType {
    if (node.kind === "BuiltinType") {
        // Check that it has its required fields
        if (!Object.hasOwn(node, "type")) { 
            console.warn(`Node ${node.id} claims to be a builtin type but it has no type!`) 
            return false
        }
        
        return true
    } else {
        return false
    }
}

export function traverse(node: ASTNode, callback: (node: ASTNode) => void) {
    callback(node)
    if (node.inner && node.inner.length  > 0) {
        node.inner.forEach(inner => traverse(inner, callback))
    } else {
        return
    }
}

export function find_nodes(node: ASTNode, callback: (node: ASTNode) => boolean): ASTNode[] {
    var found: ASTNode[] = []
    traverse(node, (node) => {
        if (callback(node)) {
            found.push(node)
        }
    })
    return found
}

function check_node(node: ASTNode): boolean {
    // Check the node's kind and verify that it matches the kind of the node
    switch(node.kind) {
        case "FunctionDecl":
            return isFunctionDecl(node)
        case "ParmVarDecl":
            return isParamVarDecl(node)
        case "TypedefDecl":
            return isTypedefDecl(node)
        case "BuiltinType":
            return isBuiltinType(node)
        default:
            return true
    }
}

function check_nodes(node: ASTNode) {
    traverse(node, (node) => {
        if (!check_node(node)) {
            console.warn(`Node ${node.id} is invalid!`)
        }
    })
}

// The AST is a tree of nodes
export function ParseAST(text: string): ASTNode {
    // Parse the text as JSON into an ASTNode
    var ast = JSON.parse(text) as ASTNode
    // Check that all nodes are valid, and if not, warn the user.
    check_nodes(ast)
    return ast
}

export function GetTypeDefs(ast: ASTNode): Typedefs {
    var typedefs: Typedefs = {}
    traverse(ast, (node) => {
        if (isTypedefDecl(node)) {
            // Check if the type is defined in the typedefs
            var ownType = node.type.desugaredQualType ?? node.type.qualType
            if (ownType in typedefs) {
                typedefs[node.name] = typedefs[ownType]
            } else {
                typedefs[node.name] = ownType
            }
        }
    })
    return typedefs
}
type Typedefs = {[key: string]: string | undefined}

export async function CreateAST(filePath: string, config: BunchConfig): Promise<ASTNode> {

    if(config.use_cache) {
        const cacheDir = config.bunch_dir + "/cache"
        const cache = await ASTCache.TryCache(filePath, cacheDir)
        if (cache) {
            return cache.ast
        }
    }

    // Run clang on the file and get the AST
    const cmd = ["clang", "-Xclang", "-ast-dump=json", "-fsyntax-only", filePath]
    const proc = spawn({cmd: cmd, stdout: "pipe"})

    // if (existsSync('./.tmp-ast-test.json')) {
    //     rmSync('./.tmp-ast-test.json')
    // }
    // const testFile = Bun.file('./.tmp-ast-test.json').writer()

    var text = ""
    for await (const chunk of proc.stdout) {
        text += new TextDecoder().decode(chunk)
        // testFile.write(chunk)
    }
    // testFile.flush()
    const ast = ParseAST(text)

    if(config.use_cache) {
        const cacheDir = config.bunch_dir + "/cache"

        if (!existsSync(cacheDir)) {
            mkdirSync(cacheDir, {recursive: true})
        }

        const cache = await ASTCache.FromFile(filePath, ast)
        const cacheFile = Bun.file(cacheDir + "/" + basename(filePath) + ".astcache").writer()
        cacheFile.write(cache.toString())
        cacheFile.flush()
    }

    return ast
}

// Built-in types that we can match via string comparison
const static_types = {
    'void':     'void',
    
    'int8_t':   'i8',
    'int16_t':  'i16',
    'int32_t':  'i32',
    'int':      'i32',
    'int64_t':  'i64',

    'uint8_t':  'u8',
    'uint16_t': 'u16',
    'uint32_t': 'u32',
    'uint64_t': 'u64',

    'float':    'f32',
    'double':   'f64',

    'bool':     'bool',
    'char':     'char',

    'char *':   'cstring'
} as const

export function ctype_to_type(type: string, typedefs: Typedefs): string {
    if (type in static_types) {
        //@ts-ignore
        return static_types[type]
    } else if (type in typedefs) {
        var tested_types: string[] = []
        while (!(type in static_types)) {
            if (tested_types.includes(type)) {
                throw new Error(`Type ${type} is not defined!`)
            }
            type = typedefs[type] ?? type
            tested_types.push(type)
        }

        //@ts-ignore
        return static_types[type]
    }
    else {
        // Check if the type is a pointer (ends with *)
        if (type.endsWith("*")) {
            return "ptr"
        } 
        // Check if the type is a function pointer
        else if (type.match(/\(.*\)\(\*\)\(.*\)/)) {
            return "function"
        }
    }

    throw new Error(`Unknown type ${type}`)
}

export type Symbol = {
    name: string
    args: string[]
    ret: string
}

export function GetSymbolFromNode(node: FunctionDecl, typedefs: Typedefs) {
    var args = node.inner?.map((param) => {
            if(isParamVarDecl(param)) {
                return ctype_to_type(param.type.qualType, typedefs)
            } else {
                // Skip this node
                return ""
            }
        }) ?? []
    args = args.filter((arg) => arg != "")
    // Parse the return type from the functions qualType
    // A function's qualType looks like this: 'int (int, int)'
    // The return type is everything up to the first parenthesis
    const retType = node.type.qualType.split("(")[0].trim()
    var ret = ctype_to_type(retType, typedefs)
    return {name: node.name, args: args, ret: ret}
}

export function GetAllSymbols(node: ASTNode, typedefs: Typedefs): Symbol[] {
    var symbols: Symbol[] = []
    traverse(node, (node) => {
        if (isFunctionDecl(node)) {
            symbols.push(GetSymbolFromNode(node, typedefs))
        }
    })
    return symbols
}