import { expect, test } from 'bun:test'
import { FunctionDecl } from '../src/clang'

test("load simple", () => {
    var simple = require('./simple.h')
    expect(simple).toBeDefined()
    expect(simple.test).toEqual(1)
})

test("Parse AST", async () => {
    const { CreateAST, find_nodes } = await import('../src/clang')
  
    var ast = await CreateAST('./test/asttest.h', './bin/clang')
    expect(ast).toBeDefined()
    expect(ast.kind).toEqual("TranslationUnitDecl")

    var fns = find_nodes(ast, (node) => node.kind == "FunctionDecl")
    expect(fns.length).toEqual(1)
    var fn = fns[0] as FunctionDecl
    expect(fn.inner).toBeDefined()
    expect(fn.inner?.length).toEqual(2)
    expect(fn.inner?.[0].kind).toEqual("ParmVarDecl")
    expect(fn.inner?.[1].type.qualType).toEqual("int")
    expect(fn.inner?.[1].name).toEqual("b")
})

test("Convert C types to TS types", async () => {
    const { CreateAST, find_nodes, GetTypeDefs, ctype_to_type } = await import('../src/clang')

    var ast = await CreateAST('./test/typetest.h', './bin/clang')
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
})