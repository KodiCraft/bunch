import { expect, test } from 'bun:test'
import { FunctionDecl, ParamVarDecl } from '../src/clang'
import { FFIType } from 'bun:ffi'
import { prepare_config } from '../src/index'

test("Cache", async () => {
    const fs = await import('fs')
    const { ASTCache } = await import('../src/clang')

    // Clear the cache
    if (fs.existsSync('./.bunch/cache')) {
        fs.rmSync('./.bunch/cache', {recursive: true})
    }

    // Trying to load from cache now should return undefined
    expect(await ASTCache.TryCache('./test/simple.h', './.bunch/cache')).toBeUndefined()

    // Now import the file normally
    var simple = await import('simple.h')

    // Create an ASTCache instance from the newly cached file
    var cache = await ASTCache.TryCache('./test/simple.h', './.bunch/cache')
    expect(cache).toBeDefined()
    // Tell typescript that if we get here, cache is defined
    if (cache == undefined) {
        throw new Error("unreachable")
    }

    // Check that the cache is valid
    expect(await cache.Check('./test/simple.h')).toEqual(true)
}, {timeout: 10000})

test("Load simple", async () => {
    var simple = await import('simple.h')
    expect(simple).toBeDefined()
    expect(simple.__MADE_WITH_BUNCH).toEqual(true)
}, {timeout: 10000}) // This test takes a really long time on slow machines, for some reason?

test("Run functions", async () => {
    var simple = await import('simple.h')

    // Helper function to generate a cstring from a string
    function s(str: string): Uint8Array {
        var buf = new Uint8Array(str.length + 1)
        for (var i = 0; i < str.length; i++) {
            buf[i] = str.charCodeAt(i)
        }
        buf[str.length] = 0
        return buf
    }

    expect(simple).toBeDefined()
    
    expect(simple.no_type).toBeDefined()
    expect(simple.no_type()).toBeUndefined()

    expect(simple.binnum).toBeDefined()
    expect(simple.binnum(1, 2)).toEqual(3)

    // All functions below this one don't actually run any real code, they just
    // return something.

    expect(simple.split).toBeDefined()
    expect(simple.split(s("Hello"), s("This function does nothing")).toString()).toEqual("Hello")

    expect(simple.to_string).toBeDefined()
    expect(simple.to_string(456789).toString()).toEqual("123")

    expect(simple.to_int).toBeDefined()
    expect(simple.to_int(s("abcde"))).toEqual(123)

    expect(simple.is_prime).toBeDefined()
    expect(simple.is_prime(123)).toEqual(true)

    expect(simple.to_bytes).toBeDefined()
    expect(simple.to_bytes(123)).toBeDefined()

    expect(simple.make_point).toBeDefined()
    expect(simple.make_point(1, 2)).toBeDefined()
}, {timeout: 10000}) // See timeout of previous test

test("Bad library", async () => {
    const { SymbolsToFFI } = await import('../src/transpiler')
    const { prepare_config } = await import('../src/index')

    expect(() => {SymbolsToFFI([], "this_library_doesnt_exist.so", prepare_config({}))}).toThrow()

    //@ts-expect-error <- Since we're deliberately importing something that doesn't exist
    expect(async () => {await import('this_library_doesnt_exist.h')}).toThrow()
})

test("Parse AST", async () => {
    const { CreateAST, find_nodes, isFunctionDecl, isParamVarDecl, isTypedefDecl } = await import('../src/clang')
  
    var ast = await CreateAST('./test/asttest.h', prepare_config({}))
    expect(ast).toBeDefined()
    expect(ast.kind).toEqual("TranslationUnitDecl")

    var fns = find_nodes(ast, (node) => isFunctionDecl(node))
    expect(fns.length).toEqual(1)
    var fn = fns[0] as FunctionDecl
    expect(fn.inner).toBeDefined()
    expect(fn.inner?.length).toEqual(2)
    expect(fn.inner?.[0].kind).toEqual("ParmVarDecl")
    expect((fn.inner?.[1] as ParamVarDecl).type.qualType).toEqual("int")
    expect((fn.inner?.[1]as ParamVarDecl).name).toEqual("b")
})

test("Convert C types to TS types", async () => {
    const { CreateAST, find_nodes, GetTypeDefs, ctype_to_type } = await import('../src/clang')

    var ast = await CreateAST('./test/typetest.h', prepare_config({}))
    expect(ast).toBeDefined()
    
    var typedefs = GetTypeDefs(ast)
    expect(typedefs).toBeDefined()
    expect(typedefs["number"]).toEqual("int")
    expect(typedefs["string"]).toEqual("char *")
    expect(typedefs["fatnumber"]).toEqual("int")

    expect(ctype_to_type("int", typedefs)).toEqual("i32")
    expect(ctype_to_type("float", typedefs)).toEqual("f32")
    expect(ctype_to_type("char *", typedefs)).toEqual("cstring")
    expect(ctype_to_type("fatnumber", typedefs)).toEqual("i32")
    expect(ctype_to_type("char * *", typedefs)).toEqual("ptr")
    expect(ctype_to_type("(int)(*)(int, int)", typedefs)).toEqual("function")

    const fn = find_nodes(ast, (node) => node.kind == "FunctionDecl")[0] as FunctionDecl
    expect(ctype_to_type((fn.inner?.[0] as ParamVarDecl).type.qualType, typedefs)).toEqual("i32")
    expect(ctype_to_type((fn.inner?.[1] as ParamVarDecl).type.qualType, typedefs)).toEqual("i32")
})

test("Create Symbols from AST", async () => {
    const { CreateAST, GetTypeDefs, GetAllSymbols, GetSymbolFromNode } = await import('../src/clang')

    var ast = await CreateAST('./test/symboltest.h', prepare_config({}))
    expect(ast).toBeDefined()
    const typedefs = GetTypeDefs(ast)
    expect(typedefs).toBeDefined()
    const symbols = GetAllSymbols(ast, typedefs)
    expect(symbols).toBeDefined()

    expect(symbols.length).toEqual(7)
    expect(symbols[0]).toEqual({name: "func", args: ["i32", "i32"], ret: "i32"})
    expect(symbols[1]).toEqual({name: "func2", args: [], ret: "void"})
    expect(symbols[2]).toEqual({name: "func3", args: ["cstring", "cstring"], ret: "cstring"})
    expect(symbols[3]).toEqual({name: "func4", args: ["i32"], ret: "cstring"})
    expect(symbols[4]).toEqual({name: "func5", args: ["cstring"], ret: "i32"})
    expect(symbols[5]).toEqual({name: "func6", args: ["i32"], ret: "f32"})

    // See ./test/symboltest.h for why this is u8
    expect(symbols[6]).toEqual({name: "func7", args: ["i32"], ret: "u8"})
})

test("Respect LD_PRELOAD", async () => {
    const { prepare_config, find_library } = await import('../src/index')

    var config = prepare_config({
        lib_dirs: [],
        honor_ld_preload: true
    })

    // Fail finding the simple.so library without LD_PRELOAD
    expect(find_library("simple.so", config)).toBeUndefined()

    // Set LD_PRELOAD to include the simple.so's library file
    const oldPreload = process.env.LD_PRELOAD
    process.env.LD_PRELOAD = "./test/simple.so"

    // Now we should find it
    expect(find_library("simple.so", config)).toBeDefined()

    // Now return the LD_PRELOAD variable to its initial state
    process.env.LD_PRELOAD = oldPreload
})

test("Respect LD_LIBRARY_PATH", async () => {
    const { prepare_config, find_library } = await import('../src/index')

    var config = prepare_config({
        lib_dirs: [],
        honor_ld_library_path: true
    })

    // Fail finding the simple.so library without LD_LIBRARY_PATH
    expect(find_library("simple.so", config)).toBeUndefined()

    // Set LD_LIBRARY_PATH to include the test directory
    const oldPath = process.env.LD_LIBRARY_PATH
    process.env.LD_LIBRARY_PATH = "./test"

    // Now we should find it
    expect(find_library("simple.so", config)).toBeDefined()

    // Now return the LD_LIBRARY_PATH variable to its initial state
    process.env.LD_LIBRARY_PATH = oldPath
})