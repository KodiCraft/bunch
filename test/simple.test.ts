import { expect, test } from 'bun:test'

test("load simple", () => {
    var simple = require('./simple.h')
    expect(simple).toBeDefined()
    expect(simple.test).toEqual(1)
})

test("C type conversion", () => {
    var c = require('../src/c.ts')

    // https://bun.sh/docs/api/ffi
    expect(c.ctype_to_ffitype("int", {})).toBe("i32")
    expect(c.ctype_to_ffitype("int*", {})).toBe("ptr")
    expect(c.ctype_to_ffitype("int**", {})).toBe("ptr")

    expect(c.ctype_to_ffitype("int8_t", {})).toBe("i8")
    expect(c.ctype_to_ffitype("int16_t", {})).toBe("i16")
    expect(c.ctype_to_ffitype("int32_t", {})).toBe("i32")
    expect(c.ctype_to_ffitype("int64_t", {})).toBe("i64")

    expect(c.ctype_to_ffitype("uint8_t", {})).toBe("u8")
    expect(c.ctype_to_ffitype("uint16_t", {})).toBe("u16")
    expect(c.ctype_to_ffitype("uint32_t", {})).toBe("u32")
    expect(c.ctype_to_ffitype("uint64_t", {})).toBe("u64")

    expect(c.ctype_to_ffitype("float", {})).toBe("f32")
    expect(c.ctype_to_ffitype("double", {})).toBe("f64")

    expect(c.ctype_to_ffitype("char", {})).toBe("char")
    expect(c.ctype_to_ffitype("char*", {})).toBe("cstring")
    expect(c.ctype_to_ffitype("char**", {})).toBe("ptr")

    expect(c.ctype_to_ffitype("void", {})).toBe("void")
    expect(c.ctype_to_ffitype("void*", {})).toBe("ptr")

    expect(c.ctype_to_ffitype("(void*)(*)()", {})).toBe("function")

    expect(c.ctype_to_ffitype("funny", {"funny": "int"})).toBe("i32")
    expect(c.ctype_to_ffitype("funny*", {"funny": "int"})).toBe("ptr")


    expect(() => {c.ctype_to_ffitype("faketype", {})}).toThrow(/^Unknown type .*$/)
})

test("C typedef parsing", () => {
    const c = require('../src/c.ts')

    var typedefs: {[name: string]: string} = {}

    var typedef = "typedef int funny"
    
    expect(typedefs["funny"]).toBeUndefined()
    expect(c.parse_typedef(typedef, typedefs)).toEqual({
        name: "funny",
        type: "int"
    })
    
    c.parse_typedef(typedef, typedefs)
    expect(typedefs["funny"]).toBe("int")

    typedef = "typedef funny funny2"
    c.parse_typedef(typedef, typedefs)
    expect(typedefs["funny2"]).toBe("funny")
    expect(c.ctype_to_ffitype("funny2", typedefs)).toBe("i32")
})

test("C function parsing (symbol generation)", () => {
    const c = require('../src/c.ts')

    var typedefs: {[name: string]: string} = {}
    var fn = "int test(int a, int b)"
    expect(c.parse_function(fn, typedefs)).toEqual({
        name: "test",
        args: ["i32", "i32"],
        ret: "i32"
    })

    fn = "char* split(char* str, char* delim)"
    expect(c.parse_function(fn, typedefs)).toEqual({
        name: "split",
        args: ["cstring", "cstring"],
        ret: "cstring"
    })

    typedefs["size_t"] = "uint64_t"

    fn = "void* malloc(size_t size)"
    expect(c.parse_function(fn, typedefs)).toEqual({
        name: "malloc",
        args: ["u64"],
        ret: "ptr"
    })
})