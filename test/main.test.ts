import { expect, test } from 'bun:test'
import { FunctionDecl, ParamVarDecl } from '../src/clang'
import { FFIType } from 'bun:ffi'

test("Load simple", async () => {
    var simple = await import('./simple.h')
    expect(simple).toBeDefined()
    expect(simple.__MADE_WITH_BUNCH).toEqual(true)
})

test("Run functions", async () => {
    var simple = await import('./simple.h')

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
})

test("Parse AST", async () => {
    const { CreateAST, find_nodes } = await import('../src/clang')
  
    var ast = await CreateAST('./test/asttest.h')
    expect(ast).toBeDefined()
    expect(ast.kind).toEqual("TranslationUnitDecl")

    var fns = find_nodes(ast, (node) => node.kind == "FunctionDecl")
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

    var ast = await CreateAST('./test/typetest.h')
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

    var ast = await CreateAST('./test/symboltest.h')
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