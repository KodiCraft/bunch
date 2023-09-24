declare module "../../test/simple.h" {
    function no_type(): void
    function binnum(a: number, b: number): number
    function split(a: string, b: string): string
    function to_string(a: number): string
    function to_int(a: string): number
    function is_prime(a: number): boolean
    function to_bytes(a: number): number[]
    function make_point(a: number, b: number): number /* pointer */

    const __MADE_WITH_BUNCH: true
}